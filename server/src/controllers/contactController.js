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

// PATCH /api/admin/contact/:id — update status (mark READ / ARCHIVED / REPLIED).
exports.adminUpdate = async (req, res, next) => {
  try {
    const status = String(req.body.status || '');
    if (!['NEW', 'READ', 'REPLIED', 'ARCHIVED'].includes(status)) {
      return next(new AppError('Invalid status value.', 400));
    }
    const existing = await req.prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('Message not found', 404));
    const updated = await req.prisma.contactMessage.update({ where: { id: req.params.id }, data: { status } });
    res.status(200).json({ status: 'success', data: { message: updated } });
  } catch (err) { next(err); }
};

// GET /api/admin/contact/:id — full detail with reply thread.
exports.adminGet = async (req, res, next) => {
  try {
    const message = await req.prisma.contactMessage.findUnique({
      where: { id: req.params.id },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });
    if (!message) return next(new AppError('Message not found', 404));
    res.status(200).json({ status: 'success', data: { message } });
  } catch (err) { next(err); }
};

// POST /api/admin/contact/:id/reply — send email reply and persist thread entry.
// Body: { subject, body }
exports.adminReply = async (req, res, next) => {
  try {
    const message = await req.prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (!message) return next(new AppError('Message not found', 404));

    const subject = String(req.body.subject || `Re: ${message.subject || 'Your enquiry'}`).trim();
    const body    = String(req.body.body || '').trim();
    if (!body || body.length < 3) return next(new AppError('Reply cannot be empty.', 400));
    if (body.length > 10000) return next(new AppError('Reply is too long.', 400));

    // Lazy-load email helper to keep this file lean; safe no-op if RESEND_API_KEY missing.
    const { sendGeneric } = require('../utils/email');
    const adminName = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ').trim() || req.user?.email || 'StoreX Support';

    // Personalise the email a little — first name if we have one, else "there".
    const [firstName] = String(message.name || '').split(' ');
    const emailHtml = `
      <p style="font-size:14px;line-height:1.7;color:#444;">Hi ${firstName || 'there'},</p>
      <div style="font-size:14px;line-height:1.7;color:#333;white-space:pre-wrap;">${escapeHtml(body)}</div>
      <p style="font-size:13px;line-height:1.6;color:#666;margin-top:24px;">— ${escapeHtml(adminName)}<br/>StoreX Support</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
      <p style="font-size:11px;color:#999;line-height:1.6;">In reply to your original message:</p>
      <blockquote style="font-size:12px;color:#888;border-left:2px solid #eee;padding-left:12px;white-space:pre-wrap;">${escapeHtml(message.message)}</blockquote>
    `;
    const result = await sendGeneric(message.email, subject, emailHtml, { title: subject });

    // Persist the reply — even if delivery skipped/failed, we keep a record.
    const now = new Date();
    const [reply, updated] = await req.prisma.$transaction([
      req.prisma.contactReply.create({
        data: {
          messageId: message.id,
          subject,
          body,
          repliedById:   req.user?.id || null,
          repliedByName: adminName,
        },
      }),
      req.prisma.contactMessage.update({
        where: { id: message.id },
        data: {
          status: 'REPLIED',
          adminReply: body,
          replySubject: subject,
          repliedAt: now,
          repliedById:   req.user?.id || null,
          repliedByName: adminName,
        },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: { message: updated, reply },
      message: result?.skipped
        ? 'Reply saved. Email not delivered — RESEND_API_KEY is not configured.'
        : result?.error
          ? `Reply saved, but delivery failed: ${result.error}`
          : `Reply sent to ${message.email}.`,
    });
  } catch (err) { next(err); }
};

// small helper — avoid pulling in a whole sanitiser for a single-line escape.
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// DELETE /api/admin/contact/:id
exports.adminDelete = async (req, res, next) => {
  try {
    const existing = await req.prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('Message not found', 404));
    await req.prisma.contactMessage.delete({ where: { id: req.params.id } });
    res.status(200).json({ status: 'success', message: 'Message removed' });
  } catch (err) { next(err); }
};
