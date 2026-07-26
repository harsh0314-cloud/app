/*
 * Newsletter Campaigns — Admin only.
 *
 * Reuses:
 *   - req.prisma          (shared Prisma client attached in server/index.js)
 *   - utils/email.js      (Resend-backed transactional email helper)
 *
 * Data model (see prisma/schema.prisma):
 *   NewsletterCampaign            — one row per campaign
 *   NewsletterCampaignRecipient   — per-address delivery status
 */

const { AppError } = require('../utils/AppError');
const { sendGeneric } = require('../utils/email');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_AUDIENCES = ['ALL', 'ACTIVE', 'SELECTED'];

// Turn arbitrary user-provided HTML into a lightweight, email-safe fragment.
// We do NOT try to be a full HTML sanitiser — Resend/most clients handle a
// wide surface already — but we strip <script>, <iframe>, and inline event
// handlers to keep the campaign body from carrying anything obviously unsafe.
function sanitizeBodyHtml(input) {
  const raw = String(input || '');
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/ on[a-z]+\s*=\s*'[^']*'/gi, '');
}

// Resolve the list of recipient emails for a given audience selection.
async function resolveRecipients(prisma, audience, selectedEmails) {
  if (audience === 'SELECTED') {
    const list = Array.isArray(selectedEmails)
      ? selectedEmails.map((e) => String(e || '').trim().toLowerCase()).filter((e) => e && EMAIL_RE.test(e))
      : [];
    // dedupe
    return [...new Set(list)];
  }
  const where = audience === 'ACTIVE' ? { status: 'SUBSCRIBED' } : {};
  const rows = await prisma.newsletterSubscriber.findMany({
    where,
    select: { email: true },
  });
  return [...new Set(rows.map((r) => r.email))];
}

// POST /api/admin/newsletter/campaigns
// Body: { subject, body, audience, selectedEmails? }
// Creates a DRAFT campaign so admins can preview before firing "send".
exports.createCampaign = async (req, res, next) => {
  try {
    const subject = String(req.body.subject || '').trim();
    const body    = sanitizeBodyHtml(req.body.body);
    const audience = String(req.body.audience || 'ALL').toUpperCase();
    const selectedEmails = req.body.selectedEmails;

    if (!subject) return next(new AppError('Subject is required.', 400));
    if (!body || body.replace(/<[^>]+>/g, '').trim().length < 5) {
      return next(new AppError('Please write a longer email body.', 400));
    }
    if (!ALLOWED_AUDIENCES.includes(audience)) {
      return next(new AppError('Invalid audience.', 400));
    }
    if (audience === 'SELECTED' && (!Array.isArray(selectedEmails) || selectedEmails.length === 0)) {
      return next(new AppError('Please choose at least one subscriber.', 400));
    }

    const emails = await resolveRecipients(req.prisma, audience, selectedEmails);
    const admin  = req.user || {};

    const campaign = await req.prisma.newsletterCampaign.create({
      data: {
        subject,
        body,
        audience,
        recipientEmails: audience === 'SELECTED' ? emails : null,
        totalRecipients: emails.length,
        pendingCount:    emails.length,
        createdById:     admin.id || null,
        createdByName:   [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim() || admin.email || null,
      },
    });

    res.status(201).json({ status: 'success', data: { campaign, recipientCount: emails.length } });
  } catch (err) { next(err); }
};

// GET /api/admin/newsletter/campaigns
// Paginated list of past campaigns with headline analytics.
exports.listCampaigns = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const q     = String(req.query.q || '').trim();
    const status = req.query.status && req.query.status !== 'ALL' ? String(req.query.status) : undefined;

    const where = {};
    if (status) where.status = status;
    if (q) where.subject = { contains: q, mode: 'insensitive' };

    const [total, campaigns] = await Promise.all([
      req.prisma.newsletterCampaign.count({ where }),
      req.prisma.newsletterCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        // Don't ship huge HTML bodies in the list view.
        select: {
          id: true, subject: true, audience: true, status: true,
          totalRecipients: true, sentCount: true, failedCount: true, pendingCount: true,
          sentAt: true, createdByName: true, createdAt: true, updatedAt: true,
        },
      }),
    ]);

    const stats = {
      total,
      sent:      await req.prisma.newsletterCampaign.aggregate({ _sum: { sentCount: true } }).then((r) => r._sum.sentCount || 0),
      failed:    await req.prisma.newsletterCampaign.aggregate({ _sum: { failedCount: true } }).then((r) => r._sum.failedCount || 0),
      pending:   await req.prisma.newsletterCampaign.aggregate({ _sum: { pendingCount: true } }).then((r) => r._sum.pendingCount || 0),
    };

    res.status(200).json({
      status: 'success',
      data: {
        campaigns,
        stats,
        pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
    });
  } catch (err) { next(err); }
};

// GET /api/admin/newsletter/campaigns/:id
exports.getCampaign = async (req, res, next) => {
  try {
    const campaign = await req.prisma.newsletterCampaign.findUnique({
      where: { id: req.params.id },
      include: {
        recipients: {
          orderBy: { sentAt: 'desc' },
          take: 200,
        },
      },
    });
    if (!campaign) return next(new AppError('Campaign not found', 404));
    res.status(200).json({ status: 'success', data: { campaign } });
  } catch (err) { next(err); }
};

// DELETE /api/admin/newsletter/campaigns/:id
exports.deleteCampaign = async (req, res, next) => {
  try {
    const found = await req.prisma.newsletterCampaign.findUnique({ where: { id: req.params.id } });
    if (!found) return next(new AppError('Campaign not found', 404));
    if (found.status === 'SENDING') {
      return next(new AppError('Cannot delete a campaign that is currently sending.', 409));
    }
    await req.prisma.newsletterCampaign.delete({ where: { id: req.params.id } });
    res.status(200).json({ status: 'success', message: 'Campaign removed' });
  } catch (err) { next(err); }
};

// POST /api/admin/newsletter/campaigns/:id/test
// Body: { to }  → sends a single "test" copy to the given address (defaults to admin).
exports.sendTest = async (req, res, next) => {
  try {
    const campaign = await req.prisma.newsletterCampaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) return next(new AppError('Campaign not found', 404));

    const to = String(req.body.to || req.user?.email || '').trim().toLowerCase();
    if (!to || !EMAIL_RE.test(to)) return next(new AppError('Provide a valid test email address.', 400));

    const testBody = `
      <div style="background:#fef3c7;border:1px solid #f59e0b;padding:10px 14px;margin-bottom:16px;border-radius:4px;color:#92400e;font-size:12px;">
        <strong>TEST EMAIL</strong> — this preview was sent from the admin campaign editor and is not delivered to your subscribers.
      </div>
      ${campaign.body}
    `;
    const result = await sendGeneric(to, `[TEST] ${campaign.subject}`, testBody, { title: campaign.subject });

    if (result?.error) return next(new AppError(`Test send failed: ${result.error}`, 502));
    res.status(200).json({ status: 'success', data: { skipped: !!result?.skipped, to }, message: result?.skipped ? 'RESEND_API_KEY is not configured — nothing was sent.' : `Test email sent to ${to}.` });
  } catch (err) { next(err); }
};

// POST /api/admin/newsletter/campaigns/:id/send
// Fire-and-forget send: we respond as soon as the campaign transitions to
// SENDING; the actual work happens asynchronously and updates the row in
// place with sentCount/failedCount/status. The client can poll GET :id.
exports.sendCampaign = async (req, res, next) => {
  try {
    const campaign = await req.prisma.newsletterCampaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) return next(new AppError('Campaign not found', 404));

    // Prevent duplicate sends per requirements — any terminal or in-flight state blocks re-send.
    if (['SENDING', 'COMPLETED', 'PARTIAL', 'FAILED'].includes(campaign.status)) {
      return next(new AppError(`Campaign is already ${campaign.status.toLowerCase()}.`, 409));
    }

    // Rebuild the recipient list at send-time so newly-subscribed users are
    // included (unless the audience was explicitly SELECTED at creation).
    const emails = campaign.audience === 'SELECTED'
      ? (Array.isArray(campaign.recipientEmails) ? campaign.recipientEmails : [])
      : await resolveRecipients(req.prisma, campaign.audience);

    if (!emails.length) {
      await req.prisma.newsletterCampaign.update({
        where: { id: campaign.id },
        data: { status: 'FAILED', totalRecipients: 0, pendingCount: 0 },
      });
      return next(new AppError('No recipients matched this campaign\'s audience.', 400));
    }

    // Snapshot recipients — clear any previous per-address state (safety).
    await req.prisma.newsletterCampaignRecipient.deleteMany({ where: { campaignId: campaign.id } });
    await req.prisma.newsletterCampaignRecipient.createMany({
      data: emails.map((email) => ({ campaignId: campaign.id, email, status: 'PENDING' })),
      skipDuplicates: true,
    });

    await req.prisma.newsletterCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'SENDING',
        totalRecipients: emails.length,
        sentCount: 0,
        failedCount: 0,
        pendingCount: emails.length,
      },
    });

    // Kick off async processing.
    setImmediate(() => processCampaignSend(req.prisma, campaign.id).catch((err) => {
      console.error('[campaign] send failed', campaign.id, err);
    }));

    res.status(202).json({
      status: 'success',
      data: { campaignId: campaign.id, totalRecipients: emails.length },
      message: `Sending to ${emails.length} recipient${emails.length === 1 ? '' : 's'}…`,
    });
  } catch (err) { next(err); }
};

async function processCampaignSend(prisma, campaignId) {
  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return;

  const pending = await prisma.newsletterCampaignRecipient.findMany({
    where: { campaignId, status: 'PENDING' },
  });

  let sent = 0;
  let failed = 0;

  // Simple sequential loop with a small stagger — respects Resend's rate limit
  // (10 req/s) and avoids overloading the container. For very large lists,
  // this could be moved to a proper job runner later.
  for (const recipient of pending) {
    const result = await sendGeneric(recipient.email, campaign.subject, campaign.body, { title: campaign.subject });
    if (result?.error) {
      failed++;
      await prisma.newsletterCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'FAILED', error: String(result.error).slice(0, 500) },
      });
    } else if (result?.skipped) {
      // RESEND_API_KEY not set — treat as failed so admins can see it.
      failed++;
      await prisma.newsletterCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'FAILED', error: 'Email provider is not configured (RESEND_API_KEY missing).' },
      });
    } else {
      sent++;
      await prisma.newsletterCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    }

    // Update rolling counts every ~10 recipients so the UI progress bar moves.
    if ((sent + failed) % 10 === 0) {
      await prisma.newsletterCampaign.update({
        where: { id: campaignId },
        data: {
          sentCount:    sent,
          failedCount:  failed,
          pendingCount: Math.max(0, campaign.totalRecipients - sent - failed),
        },
      });
    }

    await new Promise((r) => setTimeout(r, 120));
  }

  const finalStatus = failed === 0 ? 'COMPLETED' : (sent === 0 ? 'FAILED' : 'PARTIAL');
  await prisma.newsletterCampaign.update({
    where: { id: campaignId },
    data: {
      sentCount:    sent,
      failedCount:  failed,
      pendingCount: 0,
      status:       finalStatus,
      sentAt:       new Date(),
    },
  });
}
