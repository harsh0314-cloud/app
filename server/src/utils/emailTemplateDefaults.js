// Default (factory) email templates. "Reset Default" restores these.
// Variables use {{snake_case}} placeholders rendered by renderTemplate().

const p = (txt) => `<p style="font-size:14px;line-height:1.6;color:#444;">${txt}</p>`;
const btn = (href, text) =>
  `<a href="${href}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">${text}</a>`;

const TEMPLATE_DEFAULTS = [
  {
    key: 'order_confirmation',
    name: 'Order Confirmation',
    subject: 'Your StoreX order {{order_id}} is confirmed',
    variables: { customer_name: 'Aarav', order_id: 'SX-2026-0001', order_total: '₹2,499', tracking_number: '', coupon: 'STOREX100', order_link: 'https://storex.example/orders' },
    bodyHtml: `${p('Hi {{customer_name}}, thanks for your order! We\u2019ve received it and it\u2019s being prepared.')}${p('Order <strong>{{order_id}}</strong> &mdash; total <strong>{{order_total}}</strong>')}<p style="margin:28px 0;">${btn('{{order_link}}', 'View Order')}</p>`,
  },
  {
    key: 'order_shipped',
    name: 'Order Shipped',
    subject: 'Your StoreX order {{order_id}} has shipped',
    variables: { customer_name: 'Aarav', order_id: 'SX-2026-0001', order_total: '₹2,499', tracking_number: 'TRK123456789', order_link: 'https://storex.example/orders' },
    bodyHtml: `${p('Hi {{customer_name}}, your order is on its way!')}${p('Order <strong>{{order_id}}</strong> &mdash; tracking number: <strong>{{tracking_number}}</strong>')}<p style="margin:28px 0;">${btn('{{order_link}}', 'Track Order')}</p>`,
  },
  {
    key: 'order_delivered',
    name: 'Order Delivered',
    subject: 'Your StoreX order {{order_id}} was delivered',
    variables: { customer_name: 'Aarav', order_id: 'SX-2026-0001', order_total: '₹2,499', order_link: 'https://storex.example/orders' },
    bodyHtml: `${p('Hi {{customer_name}}, your order has been delivered. We hope you love it!')}${p('Order <strong>{{order_id}}</strong> &mdash; total <strong>{{order_total}}</strong>')}<p style="margin:28px 0;">${btn('{{order_link}}', 'View Order')}</p>`,
  },
  {
    key: 'order_cancelled',
    name: 'Order Cancelled',
    subject: 'Your StoreX order {{order_id}} was cancelled',
    variables: { customer_name: 'Aarav', order_id: 'SX-2026-0001', order_total: '₹2,499', order_link: 'https://storex.example/orders' },
    bodyHtml: `${p('Hi {{customer_name}}, your order <strong>{{order_id}}</strong> has been cancelled. If this was a mistake, please contact support.')}<p style="margin:28px 0;">${btn('{{order_link}}', 'View Orders')}</p>`,
  },
  {
    key: 'order_refunded',
    name: 'Refund Processed',
    subject: 'Your StoreX refund for {{order_id}} is processed',
    variables: { customer_name: 'Aarav', order_id: 'SX-2026-0001', order_total: '₹2,499', order_link: 'https://storex.example/orders' },
    bodyHtml: `${p('Hi {{customer_name}}, your refund of <strong>{{order_total}}</strong> for order <strong>{{order_id}}</strong> has been processed. It may take a few days to reflect in your account.')}<p style="margin:28px 0;">${btn('{{order_link}}', 'View Order')}</p>`,
  },
  {
    key: 'welcome',
    name: 'Welcome',
    subject: 'Welcome to StoreX, {{customer_name}}',
    variables: { customer_name: 'Aarav', shop_link: 'https://storex.example/products' },
    bodyHtml: `${p('Hi {{customer_name}}, welcome to <strong>StoreX</strong> — we\u2019re thrilled to have you.')}${p('Explore considered essentials crafted to last. Your account is ready to go.')}<p style="margin:28px 0;">${btn('{{shop_link}}', 'Start Shopping')}</p>`,
  },
  {
    key: 'password_reset',
    name: 'Password Reset',
    subject: 'Reset your StoreX password',
    variables: { customer_name: 'Aarav', reset_link: 'https://storex.example/reset-password?token=SAMPLE' },
    bodyHtml: `${p('Hi {{customer_name}}, we received a request to reset your StoreX password.')}<p style="margin:28px 0;">${btn('{{reset_link}}', 'Reset Password')}</p><p style="font-size:12px;color:#999;line-height:1.6;">This link expires in 1 hour. If you didn\u2019t request this, you can safely ignore this email.</p>`,
  },
  {
    key: 'otp',
    name: 'OTP Verification',
    subject: 'Your StoreX verification code',
    variables: { customer_name: 'Aarav', otp_code: '482913' },
    bodyHtml: `${p('Hi {{customer_name}}, use the code below to verify your identity.')}<p style="margin:24px 0;text-align:center;"><span style="display:inline-block;background:#f5f3ef;border:1px solid #e5e5e5;padding:14px 28px;font-size:26px;font-weight:700;letter-spacing:8px;color:#111;">{{otp_code}}</span></p><p style="font-size:12px;color:#999;line-height:1.6;">This code expires in 10 minutes. Never share it with anyone.</p>`,
  },
  {
    key: 'newsletter',
    name: 'Newsletter',
    subject: 'The latest from StoreX',
    variables: { customer_name: 'Aarav', coupon: 'STOREX100', shop_link: 'https://storex.example/products' },
    bodyHtml: `${p('Hi {{customer_name}}, here\u2019s what\u2019s new at StoreX this week.')}${p('Use coupon <strong>{{coupon}}</strong> at checkout for an exclusive treat.')}<p style="margin:28px 0;">${btn('{{shop_link}}', 'Shop New Arrivals')}</p>`,
  },
];

// {{var}} → value; unknown variables are left as-is so admins can spot typos.
const renderTemplate = (str, vars = {}) =>
  String(str || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => (vars[k] != null && vars[k] !== '' ? String(vars[k]) : m));

module.exports = { TEMPLATE_DEFAULTS, renderTemplate };
