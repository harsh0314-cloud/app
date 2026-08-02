import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { isStaff, hasPermission, hasAnyPermission } from '../lib/permissions';

/**
 * Guards /admin routes.
 * - Not logged in         → /login
 * - Logged in but customer→ /unauthorized
 * - Missing permission    → /unauthorized (component shown with reason)
 * Props:
 *   perm    — single permission required (optional; else "any staff" ok)
 *   anyOf   — string[] any-of permissions required (optional)
 */
export default function ProtectedAdminRoute({ children, perm, anyOf }) {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!isStaff(user)) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (perm && !hasPermission(user, perm)) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (anyOf && !hasAnyPermission(user, anyOf)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
