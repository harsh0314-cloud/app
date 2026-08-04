import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Check, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';

const IMG = 'https://images.unsplash.com/photo-1645561305502-63a9ba09ab09?auto=format&fit=crop&w=1200&q=80';

export default function Register() {
  const [searchParams] = useSearchParams();
  const initialRef = (searchParams.get('ref') || '').trim().toUpperCase();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', referralCode: initialRef });
  const [loading, setLoading] = useState(false);
  const [refState, setRefState] = useState({ status: 'idle', firstName: null });
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  // Validate referral code as user types (debounced)
  useEffect(() => {
    const code = (form.referralCode || '').trim().toUpperCase();
    if (!code) { setRefState({ status: 'idle', firstName: null }); return; }
    if (code.length < 4) { setRefState({ status: 'idle', firstName: null }); return; }
    let cancelled = false;
    setRefState({ status: 'checking', firstName: null });
    const t = setTimeout(() => {
      api.get(`/referrals/validate?code=${encodeURIComponent(code)}`)
        .then((res) => {
          if (cancelled) return;
          const d = res.data || {};
          if (d.valid) setRefState({ status: 'valid', firstName: d.referrerFirstName });
          else setRefState({ status: 'invalid', firstName: null });
        })
        .catch(() => { if (!cancelled) setRefState({ status: 'invalid', firstName: null }); });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.referralCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.referralCode || refState.status === 'invalid') delete payload.referralCode;
      const result = await register(payload);
      toast.success('Account created');
      if (result?.referralAttributed) {
        toast.success('Referral applied! You\'ll earn 200 points on your first order.', { duration: 4500 });
      }
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

          {refState.status === 'valid' && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3" data-testid="referral-badge">
              <Sparkles size={16} className="text-emerald-600 mt-0.5" />
              <div className="text-xs text-emerald-800">
                <p className="font-semibold">Referred by {refState.firstName}</p>
                <p>You'll get <strong>+200 welcome points</strong> when your first order is delivered.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div><label className="overline text-muted-foreground">First Name</label><input type="text" required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} data-testid="register-firstname" className={input} /></div>
              <div><label className="overline text-muted-foreground">Last Name</label><input type="text" required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} data-testid="register-lastname" className={input} /></div>
            </div>
            <div><label className="overline text-muted-foreground">Email</label><input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} data-testid="register-email" className={input} placeholder="you@example.com" /></div>
            <div><label className="overline text-muted-foreground">Password</label><input type="password" required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} data-testid="register-password" className={input} placeholder="Min 8 characters" /></div>
            <div>
              <label className="overline text-muted-foreground">Referral Code (optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.referralCode}
                  onChange={(e) => update('referralCode', e.target.value.toUpperCase())}
                  data-testid="register-referral"
                  className={input + ' pr-8 uppercase'}
                  placeholder="STOREX-XXXXXX"
                  autoComplete="off"
                />
                <div className="absolute right-0 top-4">
                  {refState.status === 'valid' && <Check size={16} className="text-emerald-600" data-testid="referral-valid-icon" />}
                  {refState.status === 'invalid' && <X size={16} className="text-red-500" data-testid="referral-invalid-icon" />}
                </div>
              </div>
              {refState.status === 'invalid' && (
                <p className="mt-1 text-xs text-red-500">Referral code not recognised.</p>
              )}
            </div>
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
