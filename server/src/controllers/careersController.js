const { AppError } = require('../utils/AppError');
const { isConfigured: cloudinaryConfigured, uploadBuffer } = require('../utils/cloudinary');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_STATUSES = ['NEW', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED'];

// POST /api/careers/upload-resume — Cloudinary upload for resume files.
// Reuses the existing memoryStorage multer pipeline; PDFs allowed via Cloudinary auto-resource-type.
exports.uploadResume = async (req, res, next) => {
  try {
    if (!cloudinaryConfigured()) return next(new AppError('Resume upload is not configured on this server.', 503));
    const file = req.file || (req.files && req.files[0]);
    if (!file) return next(new AppError('No resume file provided.', 400));
    if (file.size > 10 * 1024 * 1024) return next(new AppError('Resume must be 10 MB or smaller.', 400));
    try {
      const uploaded = await uploadBuffer(file.buffer, { resource_type: 'auto' });
      res.status(201).json({ status: 'success', data: { resume: uploaded } });
    } catch (err) {
      return next(new AppError('Resume upload failed. Please try again.', 502));
    }
  } catch (err) { next(err); }
};

// POST /api/careers/apply — public job application
exports.apply = async (req, res, next) => {
  try {
    const name        = String(req.body.name        || '').trim();
    const email       = String(req.body.email       || '').trim().toLowerCase();
    const phone       = String(req.body.phone       || '').trim() || null;
    const position    = String(req.body.position    || '').trim();
    const coverLetter = String(req.body.coverLetter || '').trim() || null;
    const linkedin    = String(req.body.linkedin    || '').trim() || null;
    const portfolio   = String(req.body.portfolio   || '').trim() || null;
    const resumeUrl      = req.body.resumeUrl      ? String(req.body.resumeUrl)      : null;
    const resumePublicId = req.body.resumePublicId ? String(req.body.resumePublicId) : null;

    if (!name)  return next(new AppError('Name is required.', 400));
    if (!email || !EMAIL_RE.test(email)) return next(new AppError('Please enter a valid email address.', 400));
    if (!position) return next(new AppError('Please pick a position to apply for.', 400));

    const created = await req.prisma.jobApplication.create({
      data: { name, email, phone, position, coverLetter, linkedin, portfolio, resumeUrl, resumePublicId },
    });
    res.status(201).json({
      status: 'success',
      data: { application: { id: created.id, createdAt: created.createdAt } },
      message: 'Application received — thank you for your interest.',
    });
  } catch (err) { next(err); }
};

// GET /api/admin/careers — paginated + search + filter
exports.adminList = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const q     = String(req.query.q || '').trim();
    const status = req.query.status && req.query.status !== 'ALL' ? String(req.query.status) : undefined;
    const position = req.query.position && req.query.position !== 'ALL' ? String(req.query.position) : undefined;

    const where = {};
    if (status)   where.status   = status;
    if (position) where.position = position;
    if (q) {
      where.OR = [
        { name:     { contains: q, mode: 'insensitive' } },
        { email:    { contains: q, mode: 'insensitive' } },
        { position: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, allTotal, byStatus, applications] = await Promise.all([
      req.prisma.jobApplication.count({ where }),
      req.prisma.jobApplication.count(),
      req.prisma.jobApplication.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      req.prisma.jobApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const stats = { total: allTotal, new: 0, reviewed: 0, shortlisted: 0, rejected: 0, hired: 0 };
    for (const row of byStatus) {
      const key = row.status.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(stats, key)) stats[key] = row._count._all;
    }

    res.status(200).json({
      status: 'success',
      data: {
        applications,
        stats,
        pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
    });
  } catch (err) { next(err); }
};

// PATCH /api/admin/careers/:id
exports.adminUpdate = async (req, res, next) => {
  try {
    const status = String(req.body.status || '');
    if (!ALLOWED_STATUSES.includes(status)) return next(new AppError('Invalid status value.', 400));
    const existing = await req.prisma.jobApplication.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('Application not found', 404));
    const updated = await req.prisma.jobApplication.update({ where: { id: req.params.id }, data: { status } });
    res.status(200).json({ status: 'success', data: { application: updated } });
  } catch (err) { next(err); }
};

// DELETE /api/admin/careers/:id
exports.adminDelete = async (req, res, next) => {
  try {
    const existing = await req.prisma.jobApplication.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('Application not found', 404));
    await req.prisma.jobApplication.delete({ where: { id: req.params.id } });
    res.status(200).json({ status: 'success', message: 'Application removed' });
  } catch (err) { next(err); }
};
