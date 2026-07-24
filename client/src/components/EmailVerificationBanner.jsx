import { Mail, RefreshCw, Loader2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { Link } from 'react-router-dom';

/**
 * Yellow banner shown at the top of protected flows (checkout etc.) when a
 * user is signed in but hasn't verified their email yet. Includes a resend
 * button and link to the verify page.
 */
export default function EmailVerificationBanner({ compact = false }) {
  const { user, resendVerification } = useAuthStore();
  const [sending, setSending] = useState(false);

  if (!user || user.isVerified) return null;

  const onResend = async () => {
    setSending(true);
    try {
      await resendVerification();
      toast.success('Verification email sent. Please check your inbox.');
    } catch (err) {
      toast.error(err?.message || 'Could not send verification email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`border border-amber-200 bg-amber-50 text-amber-900 ${compact ? 'p-4' : 'p-5'}`}
      data-testid="verify-banner"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="text-sm font-semibold">Please verify your email to continue</p>
            <p className="mt-1 text-xs text-amber-900/80">
              We sent a verification link to <strong>{user.email}</strong>. Verify your address to unlock checkout, orders and rewards.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onResend}
            disabled={sending}
            data-testid="banner-resend-btn"
            className="inline-flex items-center gap-2 border border-amber-800/40 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-900 transition-colors hover:bg-amber-900 hover:text-white disabled:opacity-50"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {sending ? 'Sending' : 'Resend'}
          </button>
          <Link
            to="/verify-email"
            className="inline-flex items-center gap-2 border border-amber-900 bg-amber-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:opacity-90"
          >
            Verify Now
          </Link>
        </div>
      </div>
    </div>
  );
}
