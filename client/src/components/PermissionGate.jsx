import useAuthStore from '../store/authStore';
import { hasPermission, hasAnyPermission } from '../lib/permissions';

/**
 * <PermissionGate perm="product.create"> ... </PermissionGate>
 * <PermissionGate anyOf={['a', 'b']}> ... </PermissionGate>
 * <PermissionGate perm="..." fallback={<p>No access</p>}> ... </PermissionGate>
 */
export default function PermissionGate({ perm, anyOf, fallback = null, children }) {
  const user = useAuthStore((s) => s.user);
  const ok = anyOf ? hasAnyPermission(user, anyOf) : hasPermission(user, perm);
  return ok ? children : fallback;
}
