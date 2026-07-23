// Lightweight recursive XSS sanitizer for request bodies.
// Strips HTML tags and dangerous protocol handlers from string inputs.
// Sensitive fields (passwords / tokens) are left untouched so credentials are never mutated.

const SKIP_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'refreshToken',
  'razorpay_signature',
  'razorpay_payment_id',
  'razorpay_order_id',
]);

const cleanString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

const sanitizeValue = (value, key) => {
  if (SKIP_KEYS.has(key)) return value;
  if (typeof value === 'string') return cleanString(value);
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v, key));
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = sanitizeValue(value[k], k);
    return out;
  }
  return value;
};

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body, '');
  }
  next();
};

module.exports = { sanitizeBody, cleanString };
