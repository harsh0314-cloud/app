const { AppError } = require('../utils/AppError');
const {
  ROLE_PERMISSIONS,
  STAFF_ROLES,
  ALL,
  permissionsForUser,
  hasPermission: hasPerm,
  hasAnyPermission: hasAnyPerm,
} = require('../utils/permissions');

// ─── Legacy role-based guard (kept for backward-compat) ─────────────
// authorize('ADMIN', 'SUPER_ADMIN') — passes if req.user.role is in the list.
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Not authenticated.', 401));
    // SUPER_ADMIN can bypass role list unless explicitly excluded
    if (roles.includes(req.user.role) || (req.user.role === 'SUPER_ADMIN' && roles.length > 0)) {
      return next();
    }
    return next(new AppError('You do not have permission to perform this action.', 403));
  };
};

// ─── Staff-only guard (any admin-side role) ─────────────────────────
exports.requireStaff = (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated.', 401));
  if (!STAFF_ROLES.includes(req.user.role)) {
    return next(new AppError('Staff access required.', 403));
  }
  next();
};

// ─── Permission-based guard ─────────────────────────────────────────
// requirePermission('product.create') OR requirePermission(['a','b']) (must have ALL)
exports.requirePermission = (required) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return next(new AppError('Not authenticated.', 401));
      // Load override once per request lifetime (cache on req)
      if (!req._permCache) {
        const override = await req.prisma.userPermissionOverride
          .findUnique({ where: { userId: req.user.id } })
          .catch(() => null);
        req._permCache = permissionsForUser(req.user, override);
      }
      if (!hasPerm(req._permCache, required)) {
        return next(new AppError('You do not have permission to perform this action.', 403));
      }
      next();
    } catch (e) {
      next(e);
    }
  };
};

// requireAnyPermission(['a','b']) — pass if the user has ANY of the listed perms.
exports.requireAnyPermission = (list) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return next(new AppError('Not authenticated.', 401));
      if (!req._permCache) {
        const override = await req.prisma.userPermissionOverride
          .findUnique({ where: { userId: req.user.id } })
          .catch(() => null);
        req._permCache = permissionsForUser(req.user, override);
      }
      if (!hasAnyPerm(req._permCache, list)) {
        return next(new AppError('You do not have permission to perform this action.', 403));
      }
      next();
    } catch (e) {
      next(e);
    }
  };
};

exports.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
exports.STAFF_ROLES = STAFF_ROLES;
exports.ALL = ALL;
