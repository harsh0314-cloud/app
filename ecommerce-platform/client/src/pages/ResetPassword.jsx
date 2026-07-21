import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const IMG = 'https://images.unsplash.com/photo-1645561305502-63a9ba09ab09?auto=format&fit=crop&w=1200&q=80';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      toast.success(res.data?.message || 'Password reset');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Reset failed');
    } finally { setLoading(false); }
  };

  const input = 'mt-2 w-full border-0 border-b border-input bg-transparent px-0 py-2 focus:border-foreground focus:ring-0';

  return (
    <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-sm" data-testid="reset-password-page">
          <p className="overline text-muted-foreground">Account</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">New Password</h1>

          {!token ? (
            <div className="mt-8 space-y-6" data-testid="reset-invalid-token">
              <p className="text-sm text-muted-foreground">This reset link is invalid or incomplete. Please request a new one.</p>
              <Link to="/forgot-password" className="link-underline font-semibold text-foreground">Request new link</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 space-y-7">
              <div>
                <label className="overline text-muted-foreground">New Password</label>
                <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="reset-password" className={input} placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="overline text-muted-foreground">Confirm Password</label>
                <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="reset-confirm" className={input} placeholder="Re-enter password" />
              </div>
              <button type="submit" disabled={loading} data-testid="reset-submit" className="w-full bg-foreground py-4 text-[12px] font-semibold uppercase tracking-luxe-sm text-white transition-colors hover:bg-gold disabled:opacity-50">
                {loading ? 'Saving…' : 'Reset Password'}
              </button>
            </form>
          )}
        </motion.div>
      </div>

      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <motion.img initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} src={IMG} alt="Editorial" className="h-full w-full object-cover opacity-90" />
        <div className="absolute bottom-12 left-12 text-white">
          <p className="overline text-white/60">Members</p>
          <h2 className="mt-3 max-w-sm font-display text-4xl font-bold leading-tight">A fresh start.</h2>
        </div>
      </div>
    </div>
  );
}
