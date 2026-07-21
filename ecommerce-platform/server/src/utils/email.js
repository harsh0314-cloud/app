const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'StoreX <onboarding@resend.dev>';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

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

async function send(to, subject, html) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping send to', to);
    return { skipped: true };
  }
  try {
    const result = await resend.emails.send({ from: FROM, to: [to], subject, html });
    if (result.error) console.error('[email] Resend error:', result.error);
    return result;
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return { error: err.message };
  }
}

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
