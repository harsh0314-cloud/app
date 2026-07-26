const { AppError } = require('../utils/AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact — public form submission.
exports.submit = async (req, res, next) => {
  try {
    const name    = String(req.body.name    || '').trim();
    const email   = String(req.body.email   || '').trim().toLowerCase();
    const phone   = String(req.body.phone   || '').trim() || null;
    const subject = String(req.body.subject || '').trim() || null;
    const message = String(req.body.message || '').trim();

    if (!name)    return next(new AppError('Name is required.', 400));
    if (!email || !EMAIL_RE.test(email)) return next(new AppError('Please enter a valid email address.', 400));
    if (!message || message.length < 5) return next(new AppError('Please share a few more words in your message.', 400));
    if (message.length > 4000) return next(new AppError('Message is too long (max 4000 chars).', 400));

    const created = await req.prisma.contactMessage.create({
      data: { name, email, phone, subject, message },
    });
    res.status(201).json({
      status: 'success',
      data: { message: { id: created.id, createdAt: created.createdAt } },
      message: 'Thanks for reaching out — we\'ll get back to you shortly.',
    });
  } catch (err) { next(err); }
};

// GET /api/admin/contact — paginated + search
exports.adminList = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const q     = String(req.query.q || '').trim();
    const status = req.query.status && req.query.status !== 'ALL' ? String(req.query.status) : undefined;

    const where = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { name:    { contains: q, mode: 'insensitive' } },
        { email:   { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, unread, messages] = await Promise.all([
      req.prisma.contactMessage.count({ where }),
      req.prisma.contactMessage.count({ where: { status: 'NEW' } }),
      req.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        messages,
        stats: { total, unread },
        pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
    });
  } catch (err) { next(err); }
};

// PATCH /api/admin/contact/:id — update status (mark READ / ARCHIVED).
exports.adminUpdate = async (req, res, next) => {
  try {
    const status = String(req.body.status || '');
    if (!['NEW', 'READ', 'ARCHIVED'].includes(status)) {
      return next(new AppError('Invalid status value.', 400));
    }
    const existing = await req.prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('Message not found', 404));
    const updated = await req.prisma.contactMessage.update({ where: { id: req.params.id }, data: { status } });
    res.status(200).json({ status: 'success', data: { message: updated } });
  } catch (err) { next(err); }
};

// DELETE /api/admin/contact/:id
exports.adminDelete = async (req, res, next) => {
  try {
    const existing = await req.prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('Message not found', 404));
    await req.prisma.contactMessage.delete({ where: { id: req.params.id } });
    res.status(200).json({ status: 'success', message: 'Message removed' });
  } catch (err) { next(err); }
};
