const XLSX = require('xlsx');

// tiny inline CSV writer (avoids adding a dep)
function toCsv(rows, columns) {
  const esc = (v) => {
    if (v == null) return '';
    const s = typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(typeof c.value === 'function' ? c.value(r) : r[c.value])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

// GET /api/admin/audit-logs — server-side pagination + filters
exports.listAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 25);
    const skip = (page - 1) * limit;

    const where = buildAuditWhere(req.query);

    const [total, logs] = await req.prisma.$transaction([
      req.prisma.auditLog.count({ where }),
      req.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
    });
  } catch (e) { next(e); }
};

// GET /api/admin/audit-logs/actions — distinct list for filter dropdowns
exports.listAuditFilters = async (req, res, next) => {
  try {
    const [actions, entities, roles, users] = await Promise.all([
      req.prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
      req.prisma.auditLog.findMany({ distinct: ['entity'], select: { entity: true }, where: { entity: { not: null } }, orderBy: { entity: 'asc' } }),
      req.prisma.auditLog.findMany({ distinct: ['userRole'], select: { userRole: true }, where: { userRole: { not: null } }, orderBy: { userRole: 'asc' } }),
      req.prisma.auditLog.findMany({ distinct: ['userEmail'], select: { userEmail: true, userName: true, userId: true }, where: { userEmail: { not: null } }, orderBy: { userEmail: 'asc' }, take: 500 }),
    ]);
    res.status(200).json({
      status: 'success',
      data: {
        actions: actions.map((a) => a.action).filter(Boolean),
        entities: entities.map((e) => e.entity).filter(Boolean),
        roles: roles.map((r) => r.userRole).filter(Boolean),
        users: users.filter((u) => u.userEmail),
      },
    });
  } catch (e) { next(e); }
};

// GET /api/admin/audit-logs/:id
exports.getAuditLog = async (req, res, next) => {
  try {
    const log = await req.prisma.auditLog.findUnique({ where: { id: req.params.id } });
    if (!log) return res.status(404).json({ status: 'error', message: 'Audit log not found' });
    res.status(200).json({ status: 'success', data: { log } });
  } catch (e) { next(e); }
};

// PATCH /api/admin/audit-logs/:id — add admin notes (only editable field)
exports.updateAuditNotes = async (req, res, next) => {
  try {
    const { adminNotes } = req.body || {};
    if (typeof adminNotes !== 'string') {
      return res.status(400).json({ status: 'error', message: 'adminNotes must be a string' });
    }
    const log = await req.prisma.auditLog.update({
      where: { id: req.params.id },
      data: { adminNotes: adminNotes.slice(0, 2000) },
    });
    res.status(200).json({ status: 'success', data: { log } });
  } catch (e) { next(e); }
};

// GET /api/admin/audit-logs/export?format=csv|xlsx
exports.exportAuditLogs = async (req, res, next) => {
  try {
    const format = String(req.query.format || 'csv').toLowerCase();
    const where = buildAuditWhere(req.query);

    const logs = await req.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50000,
    });

    const columns = [
      { label: 'Timestamp', value: (r) => r.createdAt?.toISOString() },
      { label: 'User', value: (r) => r.userName || '' },
      { label: 'Email', value: 'userEmail' },
      { label: 'Role', value: 'userRole' },
      { label: 'Action', value: 'action' },
      { label: 'Entity', value: 'entity' },
      { label: 'Entity ID', value: 'entityId' },
      { label: 'Status', value: 'status' },
      { label: 'IP Address', value: 'ipAddress' },
      { label: 'Browser', value: 'browser' },
      { label: 'Device', value: 'device' },
      { label: 'Previous Value', value: (r) => r.previousValue ? JSON.stringify(r.previousValue) : '' },
      { label: 'New Value', value: (r) => r.newValue ? JSON.stringify(r.newValue) : '' },
      { label: 'Message', value: 'message' },
      { label: 'Admin Notes', value: 'adminNotes' },
    ];

    // Record the export action itself (audit-log-of-audit-log 🌀)
    try {
      const { logAudit, ACTIONS } = require('../utils/audit');
      await logAudit(req.prisma, req, ACTIONS.EXPORT, {
        entity: 'AuditLog',
        newValue: { format, filters: req.query, count: logs.length },
        message: `Exported ${logs.length} audit logs (${format.toUpperCase()})`,
      });
    } catch { /* non-blocking */ }

    if (format === 'xlsx') {
      const data = [columns.map((c) => c.label), ...logs.map((r) => columns.map((c) => (typeof c.value === 'function' ? c.value(r) : r[c.value]) ?? ''))];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'AuditLogs');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.xlsx"`);
      return res.send(buffer);
    }

    // Default CSV
    const csv = toCsv(logs, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (e) { next(e); }
};

// GET /api/admin/audit-logs/stats — small summary counters
exports.getAuditStats = async (req, res, next) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [total, last24h, last7d, byAction, failures] = await Promise.all([
      req.prisma.auditLog.count(),
      req.prisma.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
      req.prisma.auditLog.count({ where: { createdAt: { gte: weekAgo } } }),
      req.prisma.auditLog.groupBy({ by: ['action'], _count: { action: true }, orderBy: { _count: { action: 'desc' } }, take: 10 }),
      req.prisma.auditLog.count({ where: { status: 'FAILURE' } }),
    ]);
    res.status(200).json({
      status: 'success',
      data: {
        total,
        last24h,
        last7d,
        failures,
        topActions: byAction.map((b) => ({ action: b.action, count: b._count.action })),
      },
    });
  } catch (e) { next(e); }
};

// ─── helpers ────────────────────────────────────────────────────────
function buildAuditWhere(q) {
  const where = {};
  if (q.action) where.action = q.action;
  if (q.entity) where.entity = q.entity;
  if (q.entityId) where.entityId = q.entityId;
  if (q.userId) where.userId = q.userId;
  if (q.userEmail) where.userEmail = q.userEmail;
  if (q.userRole) where.userRole = q.userRole;
  if (q.status) where.status = q.status;
  if (q.ipAddress) where.ipAddress = q.ipAddress;
  if (q.search) {
    where.OR = [
      { userEmail: { contains: q.search, mode: 'insensitive' } },
      { userName: { contains: q.search, mode: 'insensitive' } },
      { action: { contains: q.search, mode: 'insensitive' } },
      { entity: { contains: q.search, mode: 'insensitive' } },
      { entityId: { contains: q.search, mode: 'insensitive' } },
      { message: { contains: q.search, mode: 'insensitive' } },
      { ipAddress: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  if (q.from || q.to) {
    where.createdAt = {};
    if (q.from) where.createdAt.gte = new Date(q.from);
    if (q.to) {
      const end = new Date(q.to);
      // treat "to" as inclusive end-of-day when it's date-only
      if (!isNaN(end)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(q.to)) end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
  }
  return where;
}
