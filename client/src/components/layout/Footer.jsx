import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowUpRight, Camera, Send, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post('/auth/newsletter', { email });
      toast.success('Welcome to the list.');
      setEmail('');
    } catch (err) {
      toast.error(err.message || 'Subscription failed');
    } finally { setLoading(false); }
  };

  const cols = [
    { title: 'Shop', links: [['All Products', '/products'], ['New Arrivals', '/products?sort=newest'], ['Best Sellers', '/products'], ['Sale', '/products?sort=price-desc']] },
    { title: 'Client Care', links: [['Contact', '#'], ['Shipping', '#'], ['Returns', '#'], ['Size Guide', '#']] },
    { title: 'Maison', links: [['Our Story', '#'], ['Sustainability', '#'], ['Careers', '#'], ['Press', '#']] },
  ];

  return (
    <footer className="mt-auto bg-foreground text-white" data-testid="site-footer">
      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="container-luxe grid gap-10 py-16 md:grid-cols-2 md:items-end md:py-24">
          <div>
            <p className="overline text-white/50">Newsletter</p>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">Join the inner circle.</h2>
            <p className="mt-4 max-w-md text-sm font-light text-white/60">Private previews, early access to drops, and 10% off your first order.</p>
          </div>
          <form onSubmit={subscribe} className="flex items-center gap-4 border-b border-white/30 pb-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="newsletter-input" placeholder="Email address" className="w-full border-0 bg-transparent p-0 text-lg text-white placeholder:text-white/40 focus:ring-0" />
            <button type="submit" disabled={loading} data-testid="newsletter-submit" className="flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-luxe-sm transition-opacity hover:opacity-60 disabled:opacity-40">
              {loading ? 'Sending' : 'Subscribe'} <ArrowUpRight size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Links */}
      <div className="container-luxe grid grid-cols-2 gap-10 py-16 md:grid-cols-5">
        <div className="col-span-2">
          <span className="font-display text-3xl font-extrabold uppercase tracking-[0.3em]">StoreX</span>
          <p className="mt-5 max-w-xs text-sm font-light text-white/50">Considered essentials and elevated staples. Designed in-house, made to endure.</p>
          <div className="mt-6 flex gap-3">
            {[Camera, Send, Globe].map((Icon, i) => (
              <a key={i} href="#" className="flex h-10 w-10 items-center justify-center border border-white/20 transition-colors hover:bg-white hover:text-foreground"><Icon size={16} /></a>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="overline text-white/50">{c.title}</h4>
            <ul className="mt-5 space-y-3 text-sm font-light text-white/80">
              {c.links.map(([label, to]) => (
                <li key={label}>{to.startsWith('/') ? <Link to={to} className="link-underline">{label}</Link> : <a href={to} className="link-underline">{label}</a>}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-luxe flex flex-col items-center justify-between gap-3 py-6 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} StoreX — All rights reserved.</p>
          <p className="uppercase tracking-luxe-sm">Crafted with intention</p>
        </div>
      </div>
    </footer>
  );
}
