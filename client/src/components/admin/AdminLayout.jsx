import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, PlusCircle, Tag, Warehouse, LogOut, RotateCcw,
  BarChart3, ClipboardList, Mail, MailPlus, MessageSquare, Briefcase,
  Shield, Users, FileText, Upload, Sparkles,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { hasPermission, roleLabel, PERMISSIONS as P } from '../../lib/permissions';

const NAV_ITEMS = [
  { to: '/admin',                 icon: LayoutDashboard, label: 'Overview',        perm: null },
  { to: '/admin/analytics',       icon: BarChart3,       label: 'Analytics',       perm: P.ANALYTICS_VIEW },
  { to: '/admin/orders',          icon: ClipboardList,   label: 'Orders',          perm: P.ORDER_VIEW },
  { to: '/admin/products',        icon: Package,         label: 'Products',        perm: P.PRODUCT_VIEW },
  { to: '/admin/inventory',       icon: Warehouse,       label: 'Inventory',       perm: P.INVENTORY_VIEW },
  { to: '/admin/add-product',     icon: PlusCircle,      label: 'Add Product',     perm: P.PRODUCT_CREATE },
  { to: '/admin/import-export',   icon: Upload,          label: 'Import / Export', perm: [P.IMPORT, P.EXPORT], anyOf: true },
  { to: '/admin/coupons',         icon: Tag,             label: 'Coupons',         perm: P.COUPON_VIEW },
  { to: '/admin/returns',         icon: RotateCcw,       label: 'Returns',         perm: P.RETURN_VIEW },
  { to: '/admin/newsletter',      icon: Mail,            label: 'Newsletter',      perm: P.NEWSLETTER_VIEW },
  { to: '/admin/email-templates', icon: MailPlus,        label: 'Email Templates', perm: P.EMAIL_TEMPLATE_VIEW },
  { to: '/admin/contact',         icon: MessageSquare,   label: 'Contact',         perm: P.CONTACT_VIEW },
  { to: '/admin/careers',         icon: Briefcase,       label: 'Careers',         perm: P.CAREER_VIEW },
  { to: '/admin/users',           icon: Users,           label: 'Team & Users',    perm: P.USER_VIEW },
  { to: '/admin/loyalty',         icon: Sparkles,        label: 'Loyalty',         perm: P.LOYALTY_VIEW },
  { to: '/admin/audit-logs',      icon: FileText,        label: 'Audit Logs',      perm: P.AUDIT_LOG_VIEW },
];

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate('/'); };

  const visible = NAV_ITEMS.filter((item) => {
    if (!item.perm) return true;
    if (item.anyOf) {
      const list = Array.isArray(item.perm) ? item.perm : [item.perm];
      return list.some((p) => hasPermission(user, p));
    }
    return hasPermission(user, item.perm);
  });

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col" data-testid="admin-sidebar">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-indigo-600" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Admin Console</h1>
          </div>
          {user && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate" data-testid="admin-user-info">
              <div className="truncate">{user.email}</div>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {roleLabel(user.role)}
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              data-testid={`admin-nav-${item.label.toLowerCase().replace(/\s|\//g, '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            data-testid="admin-logout-btn"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/50 w-full"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
