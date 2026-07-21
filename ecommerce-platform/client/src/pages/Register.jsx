import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const IMG = 'https://images.unsplash.com/photo-1645561305502-63a9ba09ab09?auto=format&fit=crop&w=1200&q=80';

export default function Register() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const update = (field, value) => setForm({ ...form, [field]: value });
  const input = 'mt-2 w-full border-0 border-b border-input bg-transparent px-0 py-2 focus:border-foreground focus:ring-0';

  return (
    <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-sm">
          <p className="overline text-muted-foreground">Account</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Create Account</h1>
          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div><label className="overline text-muted-foreground">First Name</label><input type="text" required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} data-testid="register-firstname" className={input} /></div>
              <div><label className="overline text-muted-foreground">Last Name</label><input type="text" required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} data-testid="register-lastname" className={input} /></div>
            </div>
            <div><label className="overline text-muted-foreground">Email</label><input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} data-testid="register-email" className={input} placeholder="you@example.com" /></div>
            <div><label className="overline text-muted-foreground">Password</label><input type="password" required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} data-testid="register-password" className={input} placeholder="Min 8 characters" /></div>
            <button type="submit" disabled={loading} data-testid="register-submit" className="w-full bg-foreground py-4 text-[12px] font-semibold uppercase tracking-luxe-sm text-white transition-colors hover:bg-gold disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
          <p className="mt-8 text-sm text-muted-foreground">Already a member? <Link to="/login" className="link-underline font-semibold text-foreground">Sign in</Link></p>
        </motion.div>
      </div>

      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <motion.img initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} src={IMG} alt="Editorial" className="h-full w-full object-cover opacity-90" />
        <div className="absolute bottom-12 left-12 text-white">
          <p className="overline text-white/60">Members</p>
          <h2 className="mt-3 max-w-sm font-display text-4xl font-bold leading-tight">Early access to every drop.</h2>
        </div>
      </div>
    </div>
  );
}
