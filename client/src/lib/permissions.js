  // Mirror of /app/server/src/utils/permissions.js — MUST stay in sync.
  // Frontend uses this to hide/disable UI. Server is the source of truth.

  export const PERMISSIONS = Object.freeze({
    PRODUCT_VIEW: 'product.view',
    PRODUCT_CREATE: 'product.create',
    PRODUCT_UPDATE: 'product.update',
    PRODUCT_DELETE: 'product.delete',
    INVENTORY_VIEW: 'inventory.view',
    INVENTORY_UPDATE: 'inventory.update',
    ORDER_VIEW: 'order.view',
    ORDER_UPDATE: 'order.update',
    CUSTOMER_VIEW: 'customer.view',
    CUSTOMER_UPDATE: 'customer.update',
    COUPON_VIEW: 'coupon.view',
    COUPON_MANAGE: 'coupon.manage',
    ANALYTICS_VIEW: 'analytics.view',
    SETTINGS_VIEW: 'settings.view',
    SETTINGS_MANAGE: 'settings.manage',
    USER_VIEW: 'user.view',
    USER_MANAGE: 'user.manage',
    USER_ROLE_MANAGE: 'user.role.manage',
    EMAIL_TEMPLATE_VIEW: 'email_template.view',
    EMAIL_TEMPLATE_MANAGE: 'email_template.manage',
    AUDIT_LOG_VIEW: 'audit_log.view',
    AUDIT_LOG_EXPORT: 'audit_log.export',
    IMPORT: 'import',
    EXPORT: 'export',
    RETURN_VIEW: 'return.view',
    RETURN_MANAGE: 'return.manage',
    NEWSLETTER_VIEW: 'newsletter.view',
    NEWSLETTER_MANAGE: 'newsletter.manage',
    CONTACT_VIEW: 'contact.view',
    CONTACT_MANAGE: 'contact.manage',
    CAREER_VIEW: 'career.view',
    CAREER_MANAGE: 'career.manage',
    LOYALTY_VIEW: 'loyalty.view',
    LOYALTY_MANAGE: 'loyalty.manage',
    LOYALTY_SETTINGS: 'loyalty.settings',
    REFERRAL_VIEW: 'referral.view',
    REFERRAL_MANAGE: 'referral.manage',
  });

  const P = PERMISSIONS;
  export const ALL = '*';

  export const ROLES = { USER: 'USER', SUPPORT: 'SUPPORT', STAFF: 'STAFF', MANAGER: 'MANAGER', ADMIN: 'ADMIN', SUPER_ADMIN: 'SUPER_ADMIN' };
  export const STAFF_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.SUPPORT];

  export const ROLE_PERMISSIONS = Object.freeze({
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

  export function permissionsForRole(role) {
    return ROLE_PERMISSIONS[role] || [];
  }

  export function isStaff(user) {
    return !!user && STAFF_ROLES.includes(user.role);
  }

  export function hasPermission(user, required) {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    const perms = ROLE_PERMISSIONS[user.role] || [];
    if (perms.includes(ALL)) return true;
    const list = Array.isArray(required) ? required : [required];
    return list.every((r) => perms.includes(r));
  }

  export function hasAnyPermission(user, list) {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    const perms = ROLE_PERMISSIONS[user.role] || [];
    if (perms.includes(ALL)) return true;
    return (list || []).some((r) => perms.includes(r));
  }

  export function roleLabel(role) {
    const map = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', MANAGER: 'Manager', STAFF: 'Staff', SUPPORT: 'Support', USER: 'Customer' };
    return map[role] || role;
  }
