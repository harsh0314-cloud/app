import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { roleLabel } from '../lib/permissions';

export default function Unauthorized() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6" data-testid="unauthorized-page">
      <div className="max-w-lg w-full text-center">
        <div className="mx-auto mb-6 h-16 w-16 flex items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-700">
          <ShieldAlert size={28} />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">Access denied</h1>
        <p className="text-base text-muted-foreground mb-2">
          You do not have permission to access this page.
        </p>
        {user && (
          <p className="text-sm text-muted-foreground mb-8">
            Signed in as <span className="font-medium">{user.email}</span> ({roleLabel(user.role)}).
            Please contact your administrator if this is unexpected.
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <Link to="/" data-testid="unauth-home-btn" className="px-5 py-2.5 rounded-full border border-foreground text-sm font-semibold hover:bg-foreground hover:text-white transition-colors">
            Go home
          </Link>
          <Link to="/login" data-testid="unauth-login-btn" className="px-5 py-2.5 rounded-full bg-foreground text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            Sign in with a different account
          </Link>
        </div>
      </div>
    </div>
  );
}
