import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Clock, History, ArrowUpRight, ArrowDownRight, ShieldAlert } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TYPE_STYLES = {
  EARN:       { icon: ArrowUpRight,   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  REDEEM:     { icon: ArrowDownRight, color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200' },
  EXPIRE:     { icon: Clock,          color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  ADJUSTMENT: { icon: Sparkles,       color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
};

export default function LoyaltyPanel() {
  const [wallet, setWallet] = useState(null);
  const [settings, setSettings] = useState(null);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { load(); }, []);
  useEffect(() => { fetchHistory(1); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      const [w, h] = await Promise.all([
        api.get('/loyalty/wallet'),
        api.get('/loyalty/history?limit=20'),
      ]);
      setWallet(w.data.wallet);
      setSettings(w.data.settings);
      setExpiringSoon(w.data.expiringSoon || 0);
      setHistory(h.data.transactions);
      setPagination(h.data.pagination);
    } catch (e) { toast.error(e.message || 'Failed to load loyalty data'); }
    finally { setLoading(false); }
  };

  const fetchHistory = async (page) => {
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filter) params.set('type', filter);
      const res = await api.get(`/loyalty/history?${params}`);
      setHistory(res.data.transactions);
      setPagination(res.data.pagination);
    } catch (e) { toast.error(e.message || 'Failed to load history'); }
  };

  if (loading || !wallet) {
    return <div className="animate-pulse h-40 rounded-2xl bg-gray-100 dark:bg-gray-800" data-testid="loyalty-loading"/>;
  }

  const rupees = (pts) => `₹${(pts * (settings?.redeemValuePerPoint || 0.1)).toFixed(2)}`;

  return (
    <div className="space-y-8" data-testid="loyalty-panel">
      {settings && !settings.isEnabled && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
          <ShieldAlert size={16}/> The loyalty program is currently paused by the admin. Existing points are preserved.
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-600 via-purple-600 to-amber-500 p-8 text-white">
        <div className="relative z-10 grid gap-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-widest opacity-80">Available balance</p>
            <p className="mt-2 font-display text-5xl font-bold" data-testid="loyalty-balance">{wallet.pointsBalance.toLocaleString()}</p>
            <p className="mt-1 text-sm opacity-80">≈ {rupees(wallet.pointsBalance)} in savings</p>
          </div>
          <Stat label="Total earned"   value={wallet.totalEarned}   testId="loyalty-total-earned"/>
          <Stat label="Total redeemed" value={wallet.totalRedeemed} testId="loyalty-total-redeemed"/>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"/>
      </motion.div>

      {expiringSoon > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200" data-testid="loyalty-expiring-warning">
          <Clock size={16}/>
          <span><strong>{expiringSoon}</strong> points ({rupees(expiringSoon)}) expire in the next 30 days — spend them at checkout.</span>
        </div>
      )}

      {settings && (
        <div className="rounded-2xl border border-border p-6 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-sm flex items-center gap-2"><TrendingUp size={14}/> How it works</h3>
          <ul className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <li>· Earn <strong>{settings.earnRatePerRupee}</strong> point{settings.earnRatePerRupee === 1 ? '' : 's'} per ₹1 spent (credited on delivery).</li>
            <li>· Redeem <strong>1 point = ₹{settings.redeemValuePerPoint}</strong> at checkout (min {settings.minRedeemPoints}, max {settings.maxRedeemPercent}% of subtotal).</li>
            <li>· First-order bonus: <strong>{settings.firstOrderBonus} points</strong>. Verified review bonus: <strong>{settings.reviewBonus} points</strong>.</li>
            <li>· Points expire after <strong>{settings.expiryDays} days</strong>. Earliest-earned points are used first.</li>
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-sm flex items-center gap-2"><History size={14}/> Points history</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="loyalty-filter" className="px-2 py-1 text-xs rounded border border-border bg-transparent">
            <option value="">All types</option>
            <option value="EARN">Earned</option>
            <option value="REDEEM">Redeemed</option>
            <option value="EXPIRE">Expired</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
        </div>
        <div className="divide-y divide-border">
          {history.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No transactions yet. Complete an order to start earning.</p>
          )}
          {history.map((t) => {
            const s = TYPE_STYLES[t.type] || TYPE_STYLES.EARN;
            const sign = ['REDEEM', 'EXPIRE'].includes(t.type) || (t.type === 'ADJUSTMENT' && t.balanceAfter < (t.balanceAfter + t.points)) ? '-' : '+';
            return (
              <div key={t.id} className="flex items-center gap-4 p-4" data-testid={`loyalty-txn-${t.id}`}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${s.bg} ${s.color} border ${s.border}`}>
                  <s.icon size={16}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.reason}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(t.createdAt).toLocaleString()}
                    {t.expiresAt ? ` · expires ${new Date(t.expiresAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${s.color}`}>{sign}{t.points}</p>
                <p className="hidden md:block text-xs text-muted-foreground w-16 text-right">bal {t.balanceAfter}</p>
              </div>
            );
          })}
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border text-xs">
            <span>{pagination.total} transactions</span>
            <div className="flex items-center gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetchHistory(pagination.page - 1)} className="px-2 py-1 border border-border rounded disabled:opacity-40">Prev</button>
              <span>Page {pagination.page} / {pagination.totalPages}</span>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchHistory(pagination.page + 1)} className="px-2 py-1 border border-border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, testId }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold" data-testid={testId}>{(value || 0).toLocaleString()}</p>
    </div>
  );
}
