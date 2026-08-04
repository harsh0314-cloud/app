// ────────────────────────────────────────────────────────────
// Central Permission Matrix (RBAC)
// Single source of truth used by the RBAC middleware and by the
// audit log controller. Mirrored on the client at
// /app/client/src/lib/permissions.js — keep in sync.
// ────────────────────────────────────────────────────────────

const PERMISSIONS = Object.freeze({
  // Products
  PRODUCT_VIEW: 'product.view',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_UPDATE: 'inventory.update',

  // Orders
  ORDER_VIEW: 'order.view',
  ORDER_UPDATE: 'order.update',

  // Customers
  CUSTOMER_VIEW: 'customer.view',
  CUSTOMER_UPDATE: 'customer.update',

  // Coupons
  COUPON_VIEW: 'coupon.view',
  COUPON_MANAGE: 'coupon.manage',

  // Analytics
  ANALYTICS_VIEW: 'analytics.view',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',

  // Users / Team
  USER_VIEW: 'user.view',
  USER_MANAGE: 'user.manage',
  USER_ROLE_MANAGE: 'user.role.manage',

  // Email templates
  EMAIL_TEMPLATE_VIEW: 'email_template.view',
  EMAIL_TEMPLATE_MANAGE: 'email_template.manage',

  // Audit logs
  AUDIT_LOG_VIEW: 'audit_log.view',
  AUDIT_LOG_EXPORT: 'audit_log.export',

  // Import / Export
  IMPORT: 'import',
  EXPORT: 'export',

  // Returns / Exchanges
  RETURN_VIEW: 'return.view',
  RETURN_MANAGE: 'return.manage',

  // Newsletter
  NEWSLETTER_VIEW: 'newsletter.view',
  NEWSLETTER_MANAGE: 'newsletter.manage',

  // Contact messages
  CONTACT_VIEW: 'contact.view',
  CONTACT_MANAGE: 'contact.manage',

  // Careers
  CAREER_VIEW: 'career.view',
  CAREER_MANAGE: 'career.manage',

  // Loyalty
  LOYALTY_VIEW: 'loyalty.view',
  LOYALTY_MANAGE: 'loyalty.manage',
  LOYALTY_SETTINGS: 'loyalty.settings',

  // Referrals
  REFERRAL_VIEW: 'referral.view',
  REFERRAL_MANAGE: 'referral.manage',
});

// Wildcard grants everything (used for SUPER_ADMIN)
const ALL = '*';

const ROLES = Object.freeze({
  USER: 'USER',
  SUPPORT: 'SUPPORT',
  STAFF: 'STAFF',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
});

// Any of these roles is considered "internal" staff and can access /admin
const STAFF_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.SUPPORT];

const P = PERMISSIONS;

const ROLE_PERMISSIONS = Object.freeze({
  SUPER_ADMIN: [ALL],
  ADMIN: [
    P.PRODUCT_VIEW, P.PRODUCT_CREATE, P.PRODUCT_UPDATE, P.PRODUCT_DELETE,
    P.INVENTORY_VIEW, P.INVENTORY_UPDATE,
    P.ORDER_VIEW, P.ORDER_UPDATE,
    P.CUSTOMER_VIEW, P.CUSTOMER_UPDATE,
    P.COUPON_VIEW, P.COUPON_MANAGE,
    P.ANALYTICS_VIEW,
    P.SETTINGS_VIEW, P.SETTINGS_MANAGE,
    P.USER_VIEW, P.USER_MANAGE,
    P.EMAIL_TEMPLATE_VIEW, P.EMAIL_TEMPLATE_MANAGE,
    P.AUDIT_LOG_VIEW, P.AUDIT_LOG_EXPORT,
    P.IMPORT, P.EXPORT,
    P.RETURN_VIEW, P.RETURN_MANAGE,
    P.NEWSLETTER_VIEW, P.NEWSLETTER_MANAGE,
    P.CONTACT_VIEW, P.CONTACT_MANAGE,
    P.CAREER_VIEW, P.CAREER_MANAGE,
    P.LOYALTY_VIEW, P.LOYALTY_MANAGE, P.LOYALTY_SETTINGS,
    P.REFERRAL_VIEW, P.REFERRAL_MANAGE,
  ],
  MANAGER: [
    P.PRODUCT_VIEW, P.PRODUCT_CREATE, P.PRODUCT_UPDATE, P.PRODUCT_DELETE,
    P.INVENTORY_VIEW, P.INVENTORY_UPDATE,
    P.ORDER_VIEW, P.ORDER_UPDATE,
    P.CUSTOMER_VIEW,
    P.COUPON_VIEW, P.COUPON_MANAGE,
    P.ANALYTICS_VIEW,
    P.EMAIL_TEMPLATE_VIEW,
    P.AUDIT_LOG_VIEW,
    P.IMPORT, P.EXPORT,
    P.RETURN_VIEW, P.RETURN_MANAGE,
    P.NEWSLETTER_VIEW,
    P.CONTACT_VIEW,
    P.CAREER_VIEW,
    P.LOYALTY_VIEW, P.LOYALTY_MANAGE,
    P.REFERRAL_VIEW,
  ],
  STAFF: [
    P.PRODUCT_VIEW, P.PRODUCT_UPDATE,
    P.INVENTORY_VIEW, P.INVENTORY_UPDATE,
    P.ORDER_VIEW, P.ORDER_UPDATE,
    P.CUSTOMER_VIEW,
    P.RETURN_VIEW,
    P.EXPORT,
    P.CONTACT_VIEW,
  ],
  SUPPORT: [
    P.ORDER_VIEW,
    P.CUSTOMER_VIEW,
    P.CONTACT_VIEW, P.CONTACT_MANAGE,
    P.RETURN_VIEW,
    P.NEWSLETTER_VIEW,
  ],
  USER: [],
});

// Compose the effective permission set for a user (role defaults + overrides)
function permissionsForUser(user, override) {
  const rolePerms = new Set(ROLE_PERMISSIONS[user?.role] || []);
  if (override) {
    const granted = Array.isArray(override.granted) ? override.granted : [];
    const revoked = Array.isArray(override.revoked) ? override.revoked : [];
    granted.forEach((p) => rolePerms.add(p));
    revoked.forEach((p) => rolePerms.delete(p));
  }
  return Array.from(rolePerms);
}

function hasPermission(perms, required) {
  if (!perms || !perms.length) return false;
  if (perms.includes(ALL)) return true;
  if (!required) return true;
  const list = Array.isArray(required) ? required : [required];
  return list.every((r) => perms.includes(r));
}

function hasAnyPermission(perms, list) {
  if (!perms || !perms.length) return false;
  if (perms.includes(ALL)) return true;
  return (list || []).some((r) => perms.includes(r));
}

module.exports = {
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  STAFF_ROLES,
  ALL,
  permissionsForUser,
  hasPermission,
  hasAnyPermission,
};
