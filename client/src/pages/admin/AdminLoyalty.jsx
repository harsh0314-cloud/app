import { useEffect, useState } from 'react';
import { Sparkles, Search, Settings, Save, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import PermissionGate from '../../components/PermissionGate';
import { PERMISSIONS as P } from '../../lib/permissions';

export default function AdminLoyalty() {
  const [tab, setTab] = useState('wallets');
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get('/admin/loyalty/stats').then((r) => setStats(r.data)).catch(() => {}); }, [tab]);

  return (
    <div className="space-y-6" data-testid="admin-loyalty">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles size={20}/> Loyalty Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure earning rules, monitor circulation, and adjust customer balances.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Wallets"              value={stats.walletCount}/>
          <Metric label="Points in circulation" value={stats.pointsInCirculation}/>
          <Metric label="Earned (30d)"          value={stats.earnedThisMonth}   tone="green"/>
          <Metric label="Redeemed (30d)"        value={stats.redeemedThisMonth} tone="red"/>
        </div>
      )}

      <div className="flex gap-6 border-b border-border">
        <TabButton label="Wallets"      active={tab === 'wallets'}      onClick={() => setTab('wallets')} testId="loyalty-tab-wallets"/>
        <TabButton label="Transactions" active={tab === 'transactions'} onClick={() => setTab('transactions')} testId="loyalty-tab-transactions"/>
        <PermissionGate perm={P.LOYALTY_SETTINGS}>
          <TabButton label="Settings"     active={tab === 'settings'}     onClick={() => setTab('settings')} testId="loyalty-tab-settings"/>
        </PermissionGate>
      </div>

      {tab === 'wallets'      && <WalletsTable/>}
      {tab === 'transactions' && <TransactionsTable/>}
      {tab === 'settings'     && <SettingsPanel/>}
    </div>
  );
}

function TabButton({ label, active, onClick, testId }) {
  return (
    <button onClick={onClick} data-testid={testId}
      className={`pb-3 -mb-px text-sm font-medium border-b-2 ${active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
      {label}
    </button>
  );
}

function Metric({ label, value, tone }) {
  const c = tone === 'green' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : 'text-gray-900 dark:text-white';
  return (
    <div className="border border-border rounded-xl p-4 bg-white dark:bg-gray-800">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${c}`}>{(value || 0).toLocaleString()}</p>
    </div>
  );
}

function WalletsTable() {
  const [wallets, setWallets] = useState([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [adjust, setAdjust] = useState(null);

  useEffect(() => { fetch(1); }, []);
  const fetch = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      const r = await api.get(`/admin/loyalty/wallets?${params}`);
      setWallets(r.data.wallets); setPagination(r.data.pagination);
    } catch (e) { toast.error(e.message || 'Failed to load wallets'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3" data-testid="loyalty-wallets-tab">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetch(1)} placeholder="Search by email or name…" data-testid="loyalty-wallet-search" className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-transparent"/>
        </div>
        <button onClick={() => fetch(1)} className="px-4 py-2 rounded-lg border border-border text-sm">Search</button>
      </div>
      <div className="border border-border rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-2">Customer</th>
              <th className="text-right px-4 py-2">Balance</th>
              <th className="text-right px-4 py-2">Earned</th>
              <th className="text-right px-4 py-2">Redeemed</th>
              <th className="text-right px-4 py-2"> </th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && wallets.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No wallets yet.</td></tr>}
            {wallets.map((w) => (
              <tr key={w.id} data-testid={`loyalty-wallet-row-${w.userId}`} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <div className="font-medium">{w.user?.firstName} {w.user?.lastName}</div>
                  <div className="text-xs text-muted-foreground">{w.user?.email}</div>
                </td>
                <td className="px-4 py-2 text-right font-mono">{w.pointsBalance}</td>
                <td className="px-4 py-2 text-right text-emerald-700">{w.totalEarned}</td>
                <td className="px-4 py-2 text-right text-red-600">{w.totalRedeemed}</td>
                <td className="px-4 py-2 text-right">
                  <PermissionGate perm={P.LOYALTY_MANAGE}>
                    <button onClick={() => setAdjust(w)} data-testid={`loyalty-adjust-${w.userId}`} className="px-3 py-1 text-xs rounded border border-border hover:bg-gray-50 dark:hover:bg-gray-700">Adjust</button>
                  </PermissionGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination.totalPages > 1 && (
          <div className="p-3 flex justify-end gap-2 text-xs border-t border-border">
            <button disabled={pagination.page <= 1} onClick={() => fetch(pagination.page - 1)} className="px-2 py-1 border border-border rounded disabled:opacity-40">Prev</button>
            <span>{pagination.page}/{pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetch(pagination.page + 1)} className="px-2 py-1 border border-border rounded disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
      {adjust && <AdjustModal wallet={adjust} onClose={() => setAdjust(null)} onSaved={() => { setAdjust(null); fetch(pagination.page); }}/>}
    </div>
  );
}

function AdjustModal({ wallet, onClose, onSaved }) {
  const [direction, setDirection] = useState('CREDIT');
  const [points, setPoints] = useState(100);
  const [reason, setReason] = useState('Goodwill credit');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!points || points <= 0) return toast.error('Enter a positive number');
    setSaving(true);
    try { await api.post(`/admin/loyalty/wallets/${wallet.userId}/adjust`, { direction, points: parseInt(points), reason, notes }); toast.success('Wallet updated'); onSaved(); }
    catch (e) { toast.error(e.message || 'Failed'); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()} data-testid="loyalty-adjust-modal">
        <h3 className="text-lg font-bold">Adjust · {wallet.user?.email}</h3>
        <p className="text-xs text-muted-foreground">Current balance: <strong>{wallet.pointsBalance}</strong></p>
        <div className="flex gap-2">
          <button onClick={() => setDirection('CREDIT')} data-testid="adjust-credit-btn" className={`flex-1 py-2 text-xs rounded border ${direction === 'CREDIT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'border-border'}`}><ArrowUpRight size={12} className="inline mr-1"/>Credit</button>
          <button onClick={() => setDirection('DEBIT')}  data-testid="adjust-debit-btn"  className={`flex-1 py-2 text-xs rounded border ${direction === 'DEBIT'  ? 'bg-red-50 text-red-700 border-red-200' : 'border-border'}`}><ArrowDownRight size={12} className="inline mr-1"/>Debit</button>
        </div>
        <input type="number" min={1} value={points} onChange={(e) => setPoints(e.target.value)} data-testid="adjust-points-input" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent" placeholder="Points"/>
        <input value={reason} onChange={(e) => setReason(e.target.value)} data-testid="adjust-reason-input" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent" placeholder="Reason (shown to customer)"/>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent" placeholder="Internal notes (optional)"/>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border">Cancel</button>
          <button onClick={submit} disabled={saving} data-testid="adjust-save-btn" className="px-4 py-2 text-sm rounded-lg bg-foreground text-white disabled:opacity-50">{saving ? 'Saving…' : 'Apply'}</button>
        </div>
      </div>
    </div>
  );
}

function TransactionsTable() {
  const [txns, setTxns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(1); }, [type]);
  const fetch = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (type) params.set('type', type);
      const r = await api.get(`/admin/loyalty/transactions?${params}`);
      setTxns(r.data.transactions); setPagination(r.data.pagination);
    } catch (e) { toast.error(e.message || 'Failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="space-y-3" data-testid="loyalty-txns-tab">
      <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-transparent">
        <option value="">All types</option><option value="EARN">EARN</option><option value="REDEEM">REDEEM</option><option value="EXPIRE">EXPIRE</option><option value="ADJUSTMENT">ADJUSTMENT</option>
      </select>
      <div className="border border-border rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-border"><tr>
            <th className="text-left px-3 py-2">When</th><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Reason</th><th className="text-right px-3 py-2">Points</th><th className="text-right px-3 py-2">Balance</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && txns.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No transactions.</td></tr>}
            {txns.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0" data-testid={`loyalty-admin-txn-${t.id}`}>
                <td className="px-3 py-2">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 font-mono">{t.userId.slice(0, 8)}…</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  t.type === 'EARN' ? 'bg-emerald-50 text-emerald-700' :
                  t.type === 'REDEEM' ? 'bg-red-50 text-red-700' :
                  t.type === 'EXPIRE' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                }`}>{t.type}</span></td>
                <td className="px-3 py-2">{t.reason}</td>
                <td className="px-3 py-2 text-right font-mono">{t.points}</td>
                <td className="px-3 py-2 text-right font-mono">{t.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination.totalPages > 1 && (
          <div className="p-3 flex justify-end gap-2 text-xs border-t border-border">
            <button disabled={pagination.page <= 1} onClick={() => fetch(pagination.page - 1)} className="px-2 py-1 border border-border rounded disabled:opacity-40">Prev</button>
            <span>{pagination.page}/{pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetch(pagination.page + 1)} className="px-2 py-1 border border-border rounded disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get('/admin/loyalty/settings').then((r) => setS(r.data.settings)).catch((e) => toast.error(e.message)); }, []);
  const save = async () => {
    setSaving(true);
    try { const r = await api.patch('/admin/loyalty/settings', s); setS(r.data.settings); toast.success('Settings saved'); }
    catch (e) { toast.error(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };
  if (!s) return <div className="animate-pulse h-40 rounded-2xl bg-gray-100 dark:bg-gray-800"/>;
  const Row = ({ k, label, hint, type = 'number', step, min }) => (
    <label className="block text-sm">
      <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</span>
      <input type={type} step={step} min={min} value={s[k]} onChange={(e) => setS({ ...s, [k]: type === 'number' ? parseFloat(e.target.value) : e.target.value })} data-testid={`loyalty-set-${k}`} className="w-full px-3 py-2 border border-border rounded-lg bg-transparent"/>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </label>
  );
  return (
    <div className="rounded-2xl border border-border p-6 bg-white dark:bg-gray-800 space-y-4" data-testid="loyalty-settings-tab">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Settings size={14}/> Program settings</h3>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.isEnabled} onChange={(e) => setS({ ...s, isEnabled: e.target.checked })} data-testid="loyalty-set-isEnabled"/>
          Program enabled
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Row k="earnRatePerRupee"    label="Earn rate (pts per ₹1)" step="0.01"  hint="0.1 = 1 point per ₹10 spent"/>
        <Row k="redeemValuePerPoint" label="Redeem value (₹ per pt)" step="0.01" hint="0.1 = 100 pts = ₹10"/>
        <Row k="minRedeemPoints"     label="Min redemption (pts)"    step="1" min="0"/>
        <Row k="maxRedeemPercent"    label="Max redemption (% subtotal)" step="1" min="0"/>
        <Row k="expiryDays"          label="Point expiry (days)"     step="1" min="1"/>
        <Row k="registrationBonus"   label="Registration bonus (pts)" step="1" min="0"/>
        <Row k="firstOrderBonus"     label="First-order bonus (pts)"  step="1" min="0"/>
        <Row k="reviewBonus"         label="Review bonus (pts)"       step="1" min="0"/>
        <Row k="photoReviewBonus"    label="Photo-review bonus (pts)" step="1" min="0"/>
      </div>
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} data-testid="loyalty-settings-save" className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-foreground text-white disabled:opacity-50"><Save size={14}/> {saving ? 'Saving…' : 'Save settings'}</button>
      </div>
    </div>
  );
}
