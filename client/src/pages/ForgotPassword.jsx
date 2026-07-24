import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const IMG = 'https://images.pexels.com/photos/20238933/pexels-photo-20238933.jpeg?auto=compress&cs=tinysrgb&w=1200';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success(res.data?.message || 'Reset link sent');
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <motion.img initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} src={IMG} alt="Editorial" className="h-full w-full object-cover opacity-90" />
        <div className="absolute bottom-12 left-12 text-white">
          <p className="overline text-white/60">StoreX</p>
          <h2 className="mt-3 max-w-sm font-display text-4xl font-bold leading-tight">Back to where you left off.</h2>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-sm" data-testid="forgot-password-page">
          <p className="overline text-muted-foreground">Account</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Reset Password</h1>

          {sent ? (
            <div className="mt-8 space-y-6" data-testid="forgot-sent-message">
              <p className="text-sm leading-relaxed text-muted-foreground">
                If an account exists for <span className="font-semibold text-foreground">{email}</span>, we've sent a password reset link. Please check your inbox (and spam).
              </p>
              <Link to="/login" className="link-underline font-semibold text-foreground">Back to sign in</Link>
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="mt-10 space-y-7">
                <div>
                  <label className="overline text-muted-foreground">Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="forgot-email" className="mt-2 w-full border-0 border-b border-input bg-transparent px-0 py-2 focus:border-foreground focus:ring-0" placeholder="you@example.com" />
                </div>
                <button type="submit" disabled={loading} data-testid="forgot-submit" className="w-full bg-foreground py-4 text-[12px] font-semibold uppercase tracking-luxe-sm text-white transition-colors hover:bg-gold disabled:opacity-50">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <p className="mt-8 text-sm text-muted-foreground">Remembered it? <Link to="/login" className="link-underline font-semibold text-foreground">Sign in</Link></p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
