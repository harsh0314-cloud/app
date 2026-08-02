const bcrypt = require('bcryptjs');
const { AppError } = require('../utils/AppError');
const { logAudit, ACTIONS } = require('../utils/audit');
const { ROLE_PERMISSIONS, STAFF_ROLES } = require('../utils/permissions');

const ROLE_RANK = { USER: 0, SUPPORT: 1, STAFF: 2, MANAGER: 3, ADMIN: 4, SUPER_ADMIN: 5 };
const ALL_ROLES = Object.keys(ROLE_RANK);

const PUBLIC_USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true, phone: true,
  role: true, isActive: true, isVerified: true, isGuest: true,
  createdAt: true, updatedAt: true,
};

// GET /api/admin/users — list of staff+customer accounts, filterable
exports.listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const where = { isGuest: false };
    if (req.query.role) where.role = req.query.role;
    if (req.query.staff === 'true') where.role = { in: STAFF_ROLES };
    if (req.query.isActive === 'true') where.isActive = true;
    if (req.query.isActive === 'false') where.isActive = false;
    if (req.query.search) {
      where.OR = [
        { email: { contains: req.query.search, mode: 'insensitive' } },
        { firstName: { contains: req.query.search, mode: 'insensitive' } },
        { lastName: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await req.prisma.$transaction([
      req.prisma.user.count({ where }),
      req.prisma.user.findMany({
        where, skip, take: limit,
        select: { ...PUBLIC_USER_SELECT, _count: { select: { orders: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        roles: ALL_ROLES,
        rolePermissions: ROLE_PERMISSIONS,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
    });
  } catch (e) { next(e); }
};

// POST /api/admin/users — create a staff user
exports.createUser = async (req, res, next) => {
  try {
    const { email, firstName, lastName, password, role = 'STAFF', phone, isActive = true } = req.body || {};
    if (!email || !password) return next(new AppError('Email and password are required', 400));
    if (!ALL_ROLES.includes(role)) return next(new AppError('Invalid role', 400));
    if (password.length < 8) return next(new AppError('Password must be at least 8 characters', 400));

    // Only SUPER_ADMIN can create SUPER_ADMIN accounts. ADMINs can create <= MANAGER.
    if (!canAssignRole(req.user.role, role)) {
      return next(new AppError(`You cannot create a ${role} account.`, 403));
    }

    const existing = await req.prisma.user.findUnique({ where: { email } });
    if (existing) return next(new AppError('A user with this email already exists', 409));

    const hashed = await bcrypt.hash(password, 12);
    const user = await req.prisma.user.create({
      data: {
        email, password: hashed, firstName: firstName || null, lastName: lastName || null,
        phone: phone || null, role, isActive: Boolean(isActive), isVerified: true,
      },
      select: PUBLIC_USER_SELECT,
    });

    await logAudit(req.prisma, req, ACTIONS.USER_CREATE, {
      entity: 'User', entityId: user.id,
      newValue: { email: user.email, role: user.role, isActive: user.isActive },
      message: `Created ${user.role} account: ${user.email}`,
    });

    res.status(201).json({ status: 'success', data: { user } });
  } catch (e) { next(e); }
};

// PATCH /api/admin/users/:id — update basic fields (name/phone/isActive/role)
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const current = await req.prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    if (!current) return next(new AppError('User not found', 404));

    if (!canManage(req.user, current)) {
      return next(new AppError('You cannot manage this user.', 403));
    }

    const data = {};
    ['firstName', 'lastName', 'phone', 'isActive', 'isVerified'].forEach((k) => {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    });

    let previousValue = null;
    if (req.body.role && req.body.role !== current.role) {
      if (!ALL_ROLES.includes(req.body.role)) return next(new AppError('Invalid role', 400));
      if (!canAssignRole(req.user.role, req.body.role)) {
        return next(new AppError(`You cannot assign role ${req.body.role}.`, 403));
      }
      // Prevent an admin from demoting the sole SUPER_ADMIN
      if (current.role === 'SUPER_ADMIN' && req.body.role !== 'SUPER_ADMIN') {
        const superAdmins = await req.prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } });
        if (superAdmins <= 1) return next(new AppError('At least one active SUPER_ADMIN must remain.', 400));
      }
      previousValue = { role: current.role };
      data.role = req.body.role;
    }

    const user = await req.prisma.user.update({ where: { id }, data, select: PUBLIC_USER_SELECT });

    if (data.role) {
      await logAudit(req.prisma, req, ACTIONS.USER_ROLE_CHANGE, {
        entity: 'User', entityId: id,
        previousValue, newValue: { role: user.role },
        message: `Changed role of ${current.email}: ${current.role} → ${user.role}`,
      });
    }
    if (data.isActive !== undefined && data.isActive !== current.isActive) {
      await logAudit(req.prisma, req, ACTIONS.USER_STATUS_CHANGE, {
        entity: 'User', entityId: id,
        previousValue: { isActive: current.isActive }, newValue: { isActive: user.isActive },
        message: `${user.isActive ? 'Activated' : 'Deactivated'} ${current.email}`,
      });
    }
    // General update audit
    const generalKeys = ['firstName', 'lastName', 'phone', 'isVerified'];
    const changed = generalKeys.some((k) => k in data);
    if (changed) {
      await logAudit(req.prisma, req, ACTIONS.USER_UPDATE, {
        entity: 'User', entityId: id,
        previousValue: Object.fromEntries(generalKeys.filter((k) => k in data).map((k) => [k, current[k]])),
        newValue: Object.fromEntries(generalKeys.filter((k) => k in data).map((k) => [k, user[k]])),
        message: `Updated ${current.email}`,
      });
    }
    res.status(200).json({ status: 'success', data: { user } });
  } catch (e) { next(e); }
};

// DELETE /api/admin/users/:id — deactivate; hard-delete only if no orders
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return next(new AppError('You cannot delete your own account.', 400));

    const user = await req.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, isActive: true, _count: { select: { orders: true } } },
    });
    if (!user) return next(new AppError('User not found', 404));
    if (!canManage(req.user, user)) return next(new AppError('You cannot delete this user.', 403));

    if (user.role === 'SUPER_ADMIN') {
      const remain = await req.prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true, id: { not: id } } });
      if (remain < 1) return next(new AppError('At least one active SUPER_ADMIN must remain.', 400));
    }

    if (user._count.orders > 0) {
      // Soft delete — preserve historical data (orders/reviews)
      await req.prisma.user.update({ where: { id }, data: { isActive: false } });
      await logAudit(req.prisma, req, ACTIONS.USER_DELETE, {
        entity: 'User', entityId: id,
        previousValue: { isActive: user.isActive },
        newValue: { isActive: false, softDeleted: true },
        message: `Deactivated ${user.email} (has ${user._count.orders} orders; hard delete blocked)`,
      });
      return res.status(200).json({ status: 'success', message: 'User deactivated (has related orders).' });
    }

    await req.prisma.user.delete({ where: { id } });
    await logAudit(req.prisma, req, ACTIONS.USER_DELETE, {
      entity: 'User', entityId: id,
      previousValue: { email: user.email, role: user.role },
      message: `Deleted ${user.email}`,
    });
    res.status(200).json({ status: 'success', message: 'User deleted' });
  } catch (e) { next(e); }
};

// POST /api/admin/users/:id/reset-password — set a new password (staff only)
exports.resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body || {};
    if (!password || password.length < 8) return next(new AppError('Password must be at least 8 characters', 400));

    const user = await req.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
    if (!user) return next(new AppError('User not found', 404));
    if (!canManage(req.user, user)) return next(new AppError('You cannot manage this user.', 403));

    const hashed = await bcrypt.hash(password, 12);
    await req.prisma.$transaction([
      req.prisma.user.update({ where: { id }, data: { password: hashed } }),
      req.prisma.session.deleteMany({ where: { userId: id } }),
    ]);

    await logAudit(req.prisma, req, ACTIONS.USER_UPDATE, {
      entity: 'User', entityId: id,
      newValue: { passwordReset: true },
      message: `Reset password for ${user.email}`,
    });
    res.status(200).json({ status: 'success', message: 'Password reset. All sessions revoked.' });
  } catch (e) { next(e); }
};

// GET /api/admin/users/roles — list of roles + permissions matrix (for UI)
exports.getRolesMatrix = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { roles: ALL_ROLES, rolePermissions: ROLE_PERMISSIONS, staffRoles: STAFF_ROLES },
  });
};

// ─── helpers ────────────────────────────────────────────────────────
function canAssignRole(actorRole, targetRole) {
  const a = ROLE_RANK[actorRole] ?? -1;
  const t = ROLE_RANK[targetRole] ?? 0;
  // Actor must be strictly higher-ranked than target (or SUPER_ADMIN)
  if (actorRole === 'SUPER_ADMIN') return true;
  return a > t && a >= ROLE_RANK.ADMIN;
}
function canManage(actor, target) {
  if (!actor || !target) return false;
  if (actor.id === target.id) return true;
  if (actor.role === 'SUPER_ADMIN') return true;
  return (ROLE_RANK[actor.role] ?? -1) > (ROLE_RANK[target.role] ?? 0);
}
