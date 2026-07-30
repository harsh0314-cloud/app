const { AppError } = require('../utils/AppError');
const { TEMPLATE_DEFAULTS, renderTemplate } = require('../utils/emailTemplateDefaults');
const { _send, shell } = require('../utils/email');

const MAX_VERSIONS = 20;

// Server-side hardening: strip active content from stored HTML (admin-only input, defense in depth).
const cleanHtml = (html) =>
  String(html || '')
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');

const publicTemplate = (t) => ({
  id: t.id,
  key: t.key,
  name: t.name,
  subject: t.subject,
  bodyHtml: t.bodyHtml,
  variables: t.variables,
  isPublished: t.isPublished,
  updatedAt: t.updatedAt,
});

async function ensureDefaults(prisma) {
  const existing = await prisma.emailTemplate.findMany({ select: { key: true } });
  const have = new Set(existing.map((t) => t.key));
  const missing = TEMPLATE_DEFAULTS.filter((d) => !have.has(d.key));
  if (missing.length) {
    await prisma.emailTemplate.createMany({
      data: missing.map((d) => ({ key: d.key, name: d.name, subject: d.subject, bodyHtml: d.bodyHtml, variables: d.variables })),
      skipDuplicates: true,
    });
  }
}

async function getByKey(prisma, key) {
  const template = await prisma.emailTemplate.findUnique({ where: { key } });
  if (template) return template;
  const def = TEMPLATE_DEFAULTS.find((d) => d.key === key);
  if (!def) return null;
  await ensureDefaults(prisma);
  return prisma.emailTemplate.findUnique({ where: { key } });
}

async function snapshotVersion(prisma, template) {
  const last = await prisma.emailTemplateVersion.findFirst({
    where: { templateId: template.id },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  await prisma.emailTemplateVersion.create({
    data: { templateId: template.id, version: (last?.version || 0) + 1, subject: template.subject, bodyHtml: template.bodyHtml },
  });
  const stale = await prisma.emailTemplateVersion.findMany({
    where: { templateId: template.id },
    orderBy: { version: 'desc' },
    skip: MAX_VERSIONS,
    select: { id: true },
  });
  if (stale.length) await prisma.emailTemplateVersion.deleteMany({ where: { id: { in: stale.map((v) => v.id) } } });
}

// GET /api/admin/email-templates
exports.listTemplates = async (req, res, next) => {
  try {
    await ensureDefaults(req.prisma);
    const templates = await req.prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { versions: true } } },
    });
    res.status(200).json({
      status: 'success',
      data: { templates: templates.map((t) => ({ ...publicTemplate(t), versionCount: t._count.versions })) },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/email-templates/:key
exports.getTemplate = async (req, res, next) => {
  try {
    const template = await getByKey(req.prisma, req.params.key);
    if (!template) return next(new AppError('Template not found', 404));
    res.status(200).json({ status: 'success', data: { template: publicTemplate(template) } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/email-templates/:key — save draft (unpublishes until re-published)
exports.updateTemplate = async (req, res, next) => {
  try {
    const template = await getByKey(req.prisma, req.params.key);
    if (!template) return next(new AppError('Template not found', 404));
    await snapshotVersion(req.prisma, template);
    const updated = await req.prisma.emailTemplate.update({
      where: { id: template.id },
      data: { subject: req.body.subject.trim(), bodyHtml: cleanHtml(req.body.bodyHtml), isPublished: false },
    });
    res.status(200).json({ status: 'success', data: { template: publicTemplate(updated) } });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/email-templates/:key/publish — content optional (publishes current draft)
exports.publishTemplate = async (req, res, next) => {
  try {
    const template = await getByKey(req.prisma, req.params.key);
    if (!template) return next(new AppError('Template not found', 404));
    const data = { isPublished: true };
    if (req.body?.subject && req.body?.bodyHtml) {
      await snapshotVersion(req.prisma, template);
      data.subject = String(req.body.subject).trim().slice(0, 300);
      data.bodyHtml = cleanHtml(req.body.bodyHtml);
    }
    const updated = await req.prisma.emailTemplate.update({ where: { id: template.id }, data });
    res.status(200).json({ status: 'success', data: { template: publicTemplate(updated) } });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/email-templates/:key/reset — restore factory default
exports.resetTemplate = async (req, res, next) => {
  try {
    const def = TEMPLATE_DEFAULTS.find((d) => d.key === req.params.key);
    if (!def) return next(new AppError('Template not found', 404));
    const template = await getByKey(req.prisma, req.params.key);
    await snapshotVersion(req.prisma, template);
    const updated = await req.prisma.emailTemplate.update({
      where: { id: template.id },
      data: { subject: def.subject, bodyHtml: def.bodyHtml, variables: def.variables, isPublished: false },
    });
    res.status(200).json({ status: 'success', data: { template: publicTemplate(updated) } });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/email-templates/:key/versions
exports.listVersions = async (req, res, next) => {
  try {
    const template = await getByKey(req.prisma, req.params.key);
    if (!template) return next(new AppError('Template not found', 404));
    const versions = await req.prisma.emailTemplateVersion.findMany({
      where: { templateId: template.id },
      orderBy: { version: 'desc' },
      take: MAX_VERSIONS,
    });
    res.status(200).json({ status: 'success', data: { versions } });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/email-templates/:key/versions/:versionId/restore
exports.restoreVersion = async (req, res, next) => {
  try {
    const template = await getByKey(req.prisma, req.params.key);
    if (!template) return next(new AppError('Template not found', 404));
    const version = await req.prisma.emailTemplateVersion.findFirst({
      where: { id: req.params.versionId, templateId: template.id },
    });
    if (!version) return next(new AppError('Version not found', 404));
    await snapshotVersion(req.prisma, template);
    const updated = await req.prisma.emailTemplate.update({
      where: { id: template.id },
      data: { subject: version.subject, bodyHtml: version.bodyHtml, isPublished: false },
    });
    res.status(200).json({ status: 'success', data: { template: publicTemplate(updated) } });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/email-templates/:key/test — send a rendered test email (rate-limited)
exports.sendTestEmail = async (req, res, next) => {
  try {
    const template = await getByKey(req.prisma, req.params.key);
    if (!template) return next(new AppError('Template not found', 404));
    const def = TEMPLATE_DEFAULTS.find((d) => d.key === template.key);
    const vars = { ...(def?.variables || {}), ...(template.variables || {}), ...(req.body.variables || {}) };
    const subject = renderTemplate(req.body.subject || template.subject, vars);
    const bodyHtml = renderTemplate(cleanHtml(req.body.bodyHtml || template.bodyHtml), vars);
    const result = await _send(req.body.to, `[TEST] ${subject}`, shell(subject, bodyHtml));
    if (result?.skipped) {
      return res.status(200).json({ status: 'success', data: { sent: false, message: 'Email service not configured (RESEND_API_KEY missing) — preview rendered but nothing was sent.' } });
    }
    if (result?.error) {
      return res.status(200).json({ status: 'success', data: { sent: false, message: `Email provider rejected the send: ${result.error}` } });
    }
    res.status(200).json({ status: 'success', data: { sent: true, message: `Test email sent to ${req.body.to}` } });
  } catch (error) {
    next(error);
  }
};
