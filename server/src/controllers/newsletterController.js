const { AppError } = require('../utils/AppError');

// Basic RFC 5322-compliant email validator — mirrors the one used elsewhere in this repo.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/newsletter/subscribe — public endpoint; deduplicates by email.
exports.subscribe = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const source = String(req.body.source || 'Footer').slice(0, 60);
    if (!email || !EMAIL_RE.test(email)) return next(new AppError('Please enter a valid email address.', 400));

    const existing = await req.prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing) {
      if (existing.status === 'SUBSCRIBED') {
        return res.status(200).json({ status: 'success', already: true, message: 'You are already subscribed.' });
      }
      // Re-subscribe an unsubscribed address.
      const revived = await req.prisma.newsletterSubscriber.update({
        where: { email },
        data: { status: 'SUBSCRIBED', unsubscribedAt: null, source },
      });
      return res.status(200).json({ status: 'success', data: { subscriber: revived }, message: 'Welcome back to the list.' });
    }

    const created = await req.prisma.newsletterSubscriber.create({ data: { email, source } });
    res.status(201).json({ status: 'success', data: { subscriber: created }, message: 'Welcome to the list.' });
  } catch (err) { next(err); }
};

// POST /api/newsletter/unsubscribe — public endpoint; idempotent.
exports.unsubscribe = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) return next(new AppError('Please enter a valid email address.', 400));

    const existing = await req.prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (!existing) return res.status(200).json({ status: 'success', message: 'You are not subscribed.' });

    if (existing.status === 'UNSUBSCRIBED') {
      return res.status(200).json({ status: 'success', message: 'You are already unsubscribed.' });
    }
    await req.prisma.newsletterSubscriber.update({
      where: { email },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    });
    res.status(200).json({ status: 'success', message: 'You have been unsubscribed.' });
  } catch (err) { next(err); }
};

// GET /api/admin/newsletter — paginated + search
exports.adminList = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const q     = String(req.query.q || '').trim();
    const status = req.query.status && req.query.status !== 'ALL' ? String(req.query.status) : undefined;

    const where = {};
    if (status) where.status = status;
    if (q) where.email = { contains: q, mode: 'insensitive' };

    const [total, allCount, subscribed, unsubscribed, subscribers] = await Promise.all([
      req.prisma.newsletterSubscriber.count({ where }),
      req.prisma.newsletterSubscriber.count(),
      req.prisma.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED' } }),
      req.prisma.newsletterSubscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
      req.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        subscribers,
        stats: { total: allCount, subscribed, unsubscribed },
        pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
    });
  } catch (err) { next(err); }
};

// DELETE /api/admin/newsletter/:id — permanent removal
exports.adminDelete = async (req, res, next) => {
  try {
    const found = await req.prisma.newsletterSubscriber.findUnique({ where: { id: req.params.id } });
    if (!found) return next(new AppError('Subscriber not found', 404));
    await req.prisma.newsletterSubscriber.delete({ where: { id: req.params.id } });
    res.status(200).json({ status: 'success', message: 'Subscriber removed' });
  } catch (err) { next(err); }
};

// GET /api/admin/newsletter/export — CSV of all subscribers (respects search/status filter).
exports.adminExportCSV = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const status = req.query.status && req.query.status !== 'ALL' ? String(req.query.status) : undefined;
    const where = {};
    if (status) where.status = status;
    if (q) where.email = { contains: q, mode: 'insensitive' };

    const rows = await req.prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { subscribedAt: 'desc' },
    });

    const escape = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = ['email', 'status', 'source', 'subscribedAt', 'unsubscribedAt'];
    const body = rows.map((r) =>
      [r.email, r.status, r.source, r.subscribedAt.toISOString(), r.unsubscribedAt ? r.unsubscribedAt.toISOString() : '']
        .map(escape).join(',')
    );
    const csv = [header.join(','), ...body].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(csv);
  } catch (err) { next(err); }
};
