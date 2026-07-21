import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    api.post('/auth/verify-email', { token })
      .then((res) => {
        setStatus('success');
        setMessage(res.data?.message || 'Your email has been verified.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may be invalid or expired.');
      });
  }, [token]);

  return (
    <div className="container-luxe flex min-h-[70vh] items-center justify-center py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md text-center" data-testid="verify-email-page">
        {status === 'verifying' && (
          <div className="flex flex-col items-center gap-6" data-testid="verify-loading">
            <Loader2 size={44} className="animate-spin text-foreground" />
            <h1 className="font-display text-3xl font-bold tracking-tight">Verifying…</h1>
            <p className="text-sm text-muted-foreground">Please wait while we confirm your email.</p>
          </div>
        )}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-6" data-testid="verify-success">
            <CheckCircle2 size={48} className="text-green-600" />
            <h1 className="font-display text-3xl font-bold tracking-tight">Email Verified</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link to="/" className="border border-foreground px-9 py-4 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">Continue Shopping</Link>
          </div>
        )}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-6" data-testid="verify-error">
            <XCircle size={48} className="text-red-600" />
            <h1 className="font-display text-3xl font-bold tracking-tight">Verification Failed</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link to="/login" className="border border-foreground px-9 py-4 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">Go to Sign In</Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
