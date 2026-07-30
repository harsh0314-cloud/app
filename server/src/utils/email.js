const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'StoreX <onboarding@resend.dev>';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ─── Admin-managed templates (Email Template Editor) ──────────────────
// When a template is PUBLISHED in the admin editor it overrides the built-in
// copy below. Any failure falls back silently to the hard-coded defaults.
let _templatePrisma = null;
const getTemplatePrisma = () => {
  if (_templatePrisma === null) {
    try {
      const { PrismaClient } = require('@prisma/client');
      _templatePrisma = new PrismaClient();
    } catch {
      _templatePrisma = undefined;
    }
  }
  return _templatePrisma;
};

const renderVars = (str, vars = {}) =>
  String(str || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => (vars[k] != null && vars[k] !== '' ? String(vars[k]) : m));

async function getPublishedTemplate(key) {
  if (!key) return null;
  try {
    const prisma = getTemplatePrisma();
    if (!prisma) return null;
    return await prisma.emailTemplate.findFirst({ where: { key, isPublished: true } });
  } catch {
    return null;
  }
}

const ORDER_TEMPLATE_KEYS = {
  CONFIRMED: 'order_confirmation',
  SHIPPED: 'order_shipped',
  DELIVERED: 'order_delivered',
  CANCELLED: 'order_cancelled',
  REFUNDED: 'order_refunded',
};

const shell = (title, bodyHtml) => `
  <div style="background:#f5f5f5;padding:40px 0;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;">
          <tr><td style="background:#111111;padding:24px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:4px;">STOREX</span>
          </td></tr>
          <tr><td style="padding:36px 40px;color:#111111;">
            <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;">${title}</h1>
            ${bodyHtml}
          </td></tr>
          <tr><td style="padding:20px 40px;border-top:1px solid #eee;color:#999;font-size:12px;text-align:center;">
            © ${new Date().getFullYear()} StoreX — Considered essentials.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;

const button = (href, text) =>
  `<a href="${href}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">${text}</a>`;

async function send(to, subject, html, { retries = 2 } = {}) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping send to', to, '| subject:', subject);
    return { skipped: true };
  }
  let lastError;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const result = await resend.emails.send({ from: FROM, to: [to], subject, html });
      if (result.error) {
        lastError = result.error;
        console.error(`[email] Resend error (attempt ${attempt}) to ${to}:`, result.error?.message || result.error);
      } else {
        console.log(`[email] sent "${subject}" to ${to} (id: ${result.data?.id || 'n/a'})`);
        return result;
      }
    } catch (err) {
      lastError = err;
      console.error(`[email] send failed (attempt ${attempt}) to ${to}:`, err.message);
    }
    if (attempt <= retries) await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  // Graceful failure — never throws to the caller
  return { error: lastError?.message || 'Email send failed' };
}

// Expose the shared helpers so marketing / support flows can reuse the exact
// same look-and-feel and delivery guarantees as transactional email.
exports._send = send;
exports.shell = shell;
exports.button = button;

// Generic sender for campaigns & admin replies — auto-wraps in the StoreX shell
// (unless the caller passes wrap:false, in which case the html is sent as-is).
exports.sendGeneric = async (to, subject, html, { wrap = true, title } = {}) => {
  const finalHtml = wrap ? shell(title || subject, html) : html;
  return send(to, subject, finalHtml);
};

exports.sendWelcomeEmail = async (to, firstName = '') => {
  const tpl = await getPublishedTemplate('welcome');
  if (tpl) {
    const vars = { customer_name: firstName || 'there', shop_link: `${CLIENT_URL}/products` };
    const subject = renderVars(tpl.subject, vars);
    return send(to, subject, shell(subject, renderVars(tpl.bodyHtml, vars)));
  }
  const body = `
    <p style="font-size:14px;line-height:1.6;color:#444;">Hi ${firstName || 'there'}, welcome to <strong>StoreX</strong> — we're thrilled to have you.</p>
    <p style="font-size:14px;line-height:1.6;color:#444;">Explore considered essentials crafted to last. Your account is ready to go.</p>
    <p style="margin:28px 0;">${button(`${CLIENT_URL}/products`, 'Start Shopping')}</p>`;
  return send(to, 'Welcome to StoreX', shell('Welcome to StoreX', body));
};

exports.sendVerificationEmail = async (to, token, firstName = '') => {
  const link = `${CLIENT_URL}/verify-email?token=${token}`;
  if (process.env.NODE_ENV !== 'production') console.log('[email] Verification link for', to, '->', link);
  const body = `
    <p style="font-size:14px;line-height:1.6;color:#444;">Hi ${firstName || 'there'}, welcome to StoreX. Please confirm your email address to activate your account.</p>
    <p style="margin:28px 0;">${button(link, 'Verify Email')}</p>
    <p style="font-size:12px;color:#999;line-height:1.6;">This link expires in 24 hours. If the button doesn't work, paste this URL into your browser:<br><span style="color:#666;word-break:break-all;">${link}</span></p>`;
  return send(to, 'Verify your StoreX account', shell('Confirm your email', body));
};

exports.sendPasswordResetEmail = async (to, token, firstName = '') => {
  const link = `${CLIENT_URL}/reset-password?token=${token}`;
  if (process.env.NODE_ENV !== 'production') console.log('[email] Password reset link for', to, '->', link);
  const body = `
    <p style="font-size:14px;line-height:1.6;color:#444;">Hi ${firstName || 'there'}, we received a request to reset your StoreX password.</p>
    <p style="margin:28px 0;">${button(link, 'Reset Password')}</p>
    <p style="font-size:12px;color:#999;line-height:1.6;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.<br><span style="color:#666;word-break:break-all;">${link}</span></p>`;
  return send(to, 'Reset your StoreX password', shell('Reset your password', body));
};

const ORDER_STATUS_COPY = {
  CONFIRMED: { subject: 'Your StoreX order is confirmed', title: 'Order confirmed', line: 'Thanks for your order! We\'ve received it and it\'s being prepared.' },
  PROCESSING: { subject: 'Your StoreX order is being processed', title: 'Order processing', line: 'Good news — your order is now being processed.' },
  SHIPPED: { subject: 'Your StoreX order has shipped', title: 'Order shipped', line: 'Your order is on its way!' },
  DELIVERED: { subject: 'Your StoreX order was delivered', title: 'Order delivered', line: 'Your order has been delivered. We hope you love it!' },
  CANCELLED: { subject: 'Your StoreX order was cancelled', title: 'Order cancelled', line: 'Your order has been cancelled. If this was a mistake, please contact support.' },
  REFUNDED: { subject: 'Your StoreX order was refunded', title: 'Order refunded', line: 'Your refund has been processed.' },
};

// Fire-and-forget transactional email for order status changes. No-ops safely if RESEND_API_KEY is unset.
exports.sendOrderStatusEmail = async (to, { orderNumber, status, firstName = '', trackingNumber, items, total } = {}) => {
  const copy = ORDER_STATUS_COPY[status];
  if (!copy) return { skipped: true };
  const tpl = await getPublishedTemplate(ORDER_TEMPLATE_KEYS[status]);
  if (tpl) {
    const vars = {
      customer_name: firstName || 'there',
      order_id: orderNumber || '',
      tracking_number: trackingNumber || '',
      order_total: total != null ? `₹${parseFloat(total).toLocaleString('en-IN')}` : '',
      order_link: `${CLIENT_URL}/orders`,
    };
    const subject = renderVars(tpl.subject, vars);
    return send(to, subject, shell(subject, renderVars(tpl.bodyHtml, vars)));
  }
  const link = `${CLIENT_URL}/orders`;
  const tracking = trackingNumber
    ? `<p style="font-size:13px;color:#444;margin-top:8px;">Tracking number: <strong>${trackingNumber}</strong></p>`
    : '';
  const itemsHtml = (Array.isArray(items) && items.length)
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
        ${items.map((it) => `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#111;">${it.name}${it.size ? ` <span style="color:#888;">(Size: ${it.size})</span>` : ''}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#666;text-align:right;white-space:nowrap;">Qty ${it.quantity}</td>
        </tr>`).join('')}
      </table>`
    : '';
  const body = `
    <p style="font-size:14px;line-height:1.6;color:#444;">Hi ${firstName || 'there'}, ${copy.line}</p>
    <p style="font-size:13px;color:#444;">Order <strong>${orderNumber}</strong> — status: <strong>${status}</strong></p>
    ${itemsHtml}
    ${tracking}
    <p style="margin:28px 0;">${button(link, 'View Order')}</p>`;
  return send(to, copy.subject, shell(copy.title, body));
};

// ─── Returns & Exchanges ──────────────────────────────────────────────
const RETURN_STATUS_COPY = {
  PENDING:          { subject: 'We received your return request',  title: 'Return request received', line: 'Thanks — we\'ve received your request and our team is reviewing it.' },
  APPROVED:         { subject: 'Your return request is approved',  title: 'Request approved',       line: 'Good news — your request has been approved. We\'ll schedule the pickup shortly.' },
  REJECTED:         { subject: 'Update on your return request',    title: 'Request declined',       line: 'Unfortunately your request could not be approved. See details below.' },
  PICKUP_SCHEDULED: { subject: 'Your pickup has been scheduled',   title: 'Pickup scheduled',       line: 'Your pickup is scheduled. Please keep the item ready and packed.' },
  PICKED_UP:        { subject: 'Your item has been picked up',     title: 'Picked up',              line: 'We\'ve collected your item. Our quality check will begin shortly.' },
  REFUND_PROCESSED: { subject: 'Your refund is processed',         title: 'Refund processed',       line: 'Your refund has been processed. It may take a few days to reflect in your account.' },
  EXCHANGE_SHIPPED: { subject: 'Your replacement has shipped',     title: 'Exchange shipped',       line: 'Your replacement item is on its way!' },
  COMPLETED:        { subject: 'Your return has been completed',   title: 'Request completed',      line: 'Your request is now complete. Thanks for shopping with StoreX.' },
  CANCELLED:        { subject: 'Your return request was cancelled',title: 'Request cancelled',      line: 'Your request has been cancelled as requested.' },
};

exports.sendReturnStatusEmail = async (to, {
  requestId,
  orderNumber,
  status,
  firstName = '',
  type = 'RETURN',
  refundAmount,
  refundMethod,
  pickupScheduledAt,
  exchangeTrackingNumber,
  adminNote,
} = {}) => {
  const copy = RETURN_STATUS_COPY[status];
  if (!copy) return { skipped: true };
  const link = `${CLIENT_URL}/returns/${requestId || ''}`;
  const noun = type === 'EXCHANGE' ? 'exchange' : 'return';
  const rows = [
    orderNumber ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;">Order</td><td style="padding:6px 0;font-size:13px;text-align:right;"><strong>${orderNumber}</strong></td></tr>` : '',
    `<tr><td style="padding:6px 0;color:#666;font-size:13px;">Type</td><td style="padding:6px 0;font-size:13px;text-align:right;"><strong>${type}</strong></td></tr>`,
    `<tr><td style="padding:6px 0;color:#666;font-size:13px;">Status</td><td style="padding:6px 0;font-size:13px;text-align:right;"><strong>${status.replace(/_/g, ' ')}</strong></td></tr>`,
    refundAmount ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;">Refund</td><td style="padding:6px 0;font-size:13px;text-align:right;"><strong>₹${parseFloat(refundAmount).toFixed(2)}${refundMethod ? ' · ' + refundMethod.replace(/_/g, ' ') : ''}</strong></td></tr>` : '',
    pickupScheduledAt ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;">Pickup on</td><td style="padding:6px 0;font-size:13px;text-align:right;"><strong>${new Date(pickupScheduledAt).toLocaleString('en-IN')}</strong></td></tr>` : '',
    exchangeTrackingNumber ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;">Tracking</td><td style="padding:6px 0;font-size:13px;text-align:right;"><strong>${exchangeTrackingNumber}</strong></td></tr>` : '',
  ].filter(Boolean).join('');
  const noteHtml = adminNote
    ? `<p style="font-size:12px;color:#666;margin-top:8px;font-style:italic;">Note from our team: ${adminNote}</p>` : '';
  const body = `
    <p style="font-size:14px;line-height:1.6;color:#444;">Hi ${firstName || 'there'}, ${copy.line.replace('return', noun)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:12px 0 4px;">${rows}</table>
    ${noteHtml}
    <p style="margin:28px 0;">${button(link, 'Track Request')}</p>`;
  return send(to, copy.subject, shell(copy.title, body));
};
