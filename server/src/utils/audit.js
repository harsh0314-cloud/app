// ────────────────────────────────────────────────────────────
// Audit-log helper. Every mutating admin action calls logAudit()
// to record who did what, when, from where, with the diff.
// Never throws — logging failures must NEVER break the request.
// ────────────────────────────────────────────────────────────

let uaParserLib = null;
try { uaParserLib = require('ua-parser-js'); } catch { /* optional */ }

const ACTIONS = Object.freeze({
  // Auth
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET: 'PASSWORD_RESET',

  // Product
  PRODUCT_CREATE: 'PRODUCT_CREATE',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE',
  PRODUCT_DELETE: 'PRODUCT_DELETE',

  // Order
  ORDER_STATUS_CHANGE: 'ORDER_STATUS_CHANGE',

  // Coupon
  COUPON_CREATE: 'COUPON_CREATE',
  COUPON_UPDATE: 'COUPON_UPDATE',
  COUPON_DELETE: 'COUPON_DELETE',
  COUPON_TOGGLE: 'COUPON_TOGGLE',

  // Users / Roles
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_ROLE_CHANGE: 'USER_ROLE_CHANGE',
  USER_STATUS_CHANGE: 'USER_STATUS_CHANGE',

  // Import / Export
  IMPORT: 'IMPORT',
  EXPORT: 'EXPORT',

  // Email templates
  EMAIL_TEMPLATE_UPDATE: 'EMAIL_TEMPLATE_UPDATE',
  EMAIL_TEMPLATE_PUBLISH: 'EMAIL_TEMPLATE_PUBLISH',
  EMAIL_TEMPLATE_RESET: 'EMAIL_TEMPLATE_RESET',

  // Settings
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',

  // Loyalty
  LOYALTY_ADJUST: 'LOYALTY_ADJUST',
  LOYALTY_SETTINGS_UPDATE: 'LOYALTY_SETTINGS_UPDATE',
  LOYALTY_EARN: 'LOYALTY_EARN',
  LOYALTY_REDEEM: 'LOYALTY_REDEEM',
  LOYALTY_EXPIRE: 'LOYALTY_EXPIRE',
});

function extractDeviceBrowser(userAgent) {
  if (!userAgent) return { device: null, browser: null };
  try {
    if (uaParserLib) {
      const p = new uaParserLib.UAParser(userAgent);
      const b = p.getBrowser();
      const d = p.getDevice();
      const os = p.getOS();
      return {
        browser: [b.name, b.version].filter(Boolean).join(' ') || null,
        device: [d.vendor, d.model, os.name && os.version ? `${os.name} ${os.version}` : os.name].filter(Boolean).join(' ') || 'desktop',
      };
    }
  } catch { /* ignore */ }
  const ua = userAgent.toLowerCase();
  const browser = ua.includes('firefox') ? 'Firefox' : ua.includes('edg/') ? 'Edge' : ua.includes('chrome') ? 'Chrome' : ua.includes('safari') ? 'Safari' : null;
  const device = ua.includes('mobile') ? 'mobile' : ua.includes('tablet') ? 'tablet' : 'desktop';
  return { device, browser };
}

function getClientIp(req) {
  if (!req) return null;
  const fwd = req.headers?.['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * logAudit — write a single audit-log entry.
 * @param {PrismaClient} prisma
 * @param {import('express').Request | null} req
 * @param {string} action - one of ACTIONS
 * @param {object} meta { entity, entityId, previousValue, newValue, status, message, notes, actor }
 */
async function logAudit(prisma, req, action, meta = {}) {
  try {
    const actor = meta.actor || req?.user || null;
    const userAgent = req?.headers?.['user-agent'] || null;
    const { device, browser } = extractDeviceBrowser(userAgent);
    await prisma.auditLog.create({
      data: {
        userId: actor?.id || null,
        userEmail: actor?.email || meta.userEmail || null,
        userName: actor ? [actor.firstName, actor.lastName].filter(Boolean).join(' ') || null : (meta.userName || null),
        userRole: actor?.role || meta.userRole || null,
        action,
        entity: meta.entity || null,
        entityId: meta.entityId ? String(meta.entityId) : null,
        previousValue: meta.previousValue == null ? null : sanitizeValue(meta.previousValue),
        newValue: meta.newValue == null ? null : sanitizeValue(meta.newValue),
        ipAddress: getClientIp(req),
        userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
        device: device || null,
        browser: browser || null,
        status: meta.status || 'SUCCESS',
        message: meta.message ? String(meta.message).slice(0, 2000) : null,
        adminNotes: meta.notes ? String(meta.notes).slice(0, 2000) : null,
      },
    });
  } catch (e) {
    // NEVER let audit logging break the request path
    // eslint-disable-next-line no-console
    console.error('[audit] logAudit failed:', e?.message || e);
  }
}

// Remove secrets before persisting values (passwords, tokens, secrets)
const SENSITIVE_KEYS = ['password', 'newpassword', 'currentpassword', 'token', 'refreshtoken', 'secret', 'apikey', 'apisecret'];
function sanitizeValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.includes(k.toLowerCase())) out[k] = '[REDACTED]';
      else if (v && typeof v === 'object') out[k] = sanitizeValue(v);
      else out[k] = v;
    }
    return out;
  }
  return value;
}

module.exports = { logAudit, ACTIONS, extractDeviceBrowser, getClientIp };
