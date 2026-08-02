import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { isStaff } from '../lib/permissions';

/**
 * Wraps customer-only pages (e.g. /profile). If a signed-in staff user
 * navigates here directly, we push them to /admin so they never see the
 * customer dashboard. Unauthenticated users pass through — the page itself
 * decides whether to bounce to /login.
 */
export default function CustomerOnlyRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  if (isStaff(user)) return <Navigate to="/admin" replace />;
  return children;
}
