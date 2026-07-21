import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const IMG = 'https://images.pexels.com/photos/20238933/pexels-photo-20238933.jpeg?auto=compress&cs=tinysrgb&w=1200';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      toast.success('Welcome back');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <motion.img initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} src={IMG} alt="Editorial" className="h-full w-full object-cover opacity-90" />
        <div className="absolute bottom-12 left-12 text-white">
          <p className="overline text-white/60">StoreX</p>
          <h2 className="mt-3 max-w-sm font-display text-4xl font-bold leading-tight">The wardrobe, distilled.</h2>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-sm">
          <p className="overline text-muted-foreground">Account</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Welcome Back</h1>
          <form onSubmit={handleSubmit} className="mt-10 space-y-7">
            <div>
              <label className="overline text-muted-foreground">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email" className="mt-2 w-full border-0 border-b border-input bg-transparent px-0 py-2 focus:border-foreground focus:ring-0" placeholder="you@example.com" />
            </div>
            <div>
              <label className="overline text-muted-foreground">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password" className="mt-2 w-full border-0 border-b border-input bg-transparent px-0 py-2 focus:border-foreground focus:ring-0" placeholder="••••••••" />
              <div className="mt-2 text-right">
                <Link to="/forgot-password" data-testid="forgot-password-link" className="text-xs text-muted-foreground transition-colors hover:text-foreground">Forgot password?</Link>
              </div>
            </div>
            <button type="submit" disabled={loading} data-testid="login-submit" className="w-full bg-foreground py-4 text-[12px] font-semibold uppercase tracking-luxe-sm text-white transition-colors hover:bg-gold disabled:opacity-50">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="mt-8 text-sm text-muted-foreground">No account? <Link to="/register" className="link-underline font-semibold text-foreground">Create one</Link></p>
        </motion.div>
      </div>
    </div>
  );
}
