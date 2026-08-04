import { useEffect, useState } from 'react';
import { Users, TrendingUp, Award, Search } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  PENDING:   'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
  REWARDED:  'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function AdminReferrals() {
  const [analytics, setAnalytics] = useState(null);
  const [list, setList] = useState({ items: [], pagination: { page: 1, totalPages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get('/admin/referrals/analytics'),
      api.get('/admin/referrals'),
    ]).then(([a, l]) => {
      if (!mounted) return;
      setAnalytics(a.data);
      setList(l.data);
    }).catch((e) => toast.error(e.message || 'Failed to load referrals'))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const fetchList = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.set('status', statusFilter);
      if (q) params.set('q', q);
      const res = await api.get(`/admin/referrals?${params}`);
      setList(res.data);
    } catch (e) { toast.error(e.message || 'Failed to refresh list'); }
  };

  useEffect(() => { const t = setTimeout(() => fetchList(1), 300); return () => clearTimeout(t); }, [q, statusFilter]);

  if (loading) {
    return <div className="p-8"><div className="animate-pulse h-40 rounded-2xl bg-gray-100"/></div>;
  }

  const t = analytics?.totals || {};
  const conv = analytics?.conversionRate ?? 0;

  return (
    <div className="p-4 md:p-8 space-y-8" data-testid="admin-referrals-page">
      <div>
        <h1 className="text-2xl font-bold">Referrals</h1>
        <p className="text-sm text-muted-foreground">Track referral attribution, conversion, and points issued.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Users}      label="Total referrals"    value={t.totalReferrals}  testId="metric-total-referrals" />
        <MetricCard icon={TrendingUp} label="Conversion rate"    value={`${conv}%`}         testId="metric-conversion" />
        <MetricCard icon={Award}      label="Rewards issued"     value={t.rewardsIssued}    testId="metric-rewards-issued" />
        <MetricCard icon={Award}      label="Points paid out"    value={(t.rewardsPointsTotal || 0).toLocaleString()} testId="metric-points-total" />
      </div>

      {analytics?.topReferrers?.length > 0 && (
        <div className="rounded-2xl border border-border bg-white">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold">Top referrers</h2>
          </div>
          <div className="divide-y divide-border">
            {analytics.topReferrers.map((r, i) => (
              <div key={r.userId} className="flex items-center gap-4 p-3">
                <span className="w-6 text-xs text-muted-foreground">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{[r.firstName, r.lastName].filter(Boolean).join(' ') || r.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.email} · {r.referralCode}</p>
                </div>
                <span className="text-xs font-semibold">{r.successfulReferrals} successful</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold flex-1">All referrals</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2 top-2.5 text-muted-foreground"/>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or code" className="pl-7 pr-3 py-1.5 text-xs rounded border border-border w-64" data-testid="admin-referrals-search"/>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1.5 text-xs rounded border border-border" data-testid="admin-referrals-status">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="REWARDED">Rewarded</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3">Referrer</th>
                <th className="text-left px-4 py-3">Referred user</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Rewards</th>
                <th className="text-left px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.items.length === 0 && (
                <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">No referrals yet.</td></tr>
              )}
              {list.items.map((r) => (
                <tr key={r.id} data-testid={`admin-referral-${r.id}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{[r.referrer?.firstName, r.referrer?.lastName].filter(Boolean).join(' ') || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.referrer?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{[r.referredUser?.firstName, r.referredUser?.lastName].filter(Boolean).join(' ') || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.referredUser?.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.referralCode}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                  <td className="px-4 py-3">{(r.rewards || []).reduce((s, x) => s + x.points, 0)} pts</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {list.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border text-xs">
            <span>{list.pagination.total} referrals</span>
            <div className="flex items-center gap-2">
              <button disabled={list.pagination.page <= 1} onClick={() => fetchList(list.pagination.page - 1)} className="px-2 py-1 border border-border rounded disabled:opacity-40">Prev</button>
              <span>Page {list.pagination.page} / {list.pagination.totalPages}</span>
              <button disabled={list.pagination.page >= list.pagination.totalPages} onClick={() => fetchList(list.pagination.page + 1)} className="px-2 py-1 border border-border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, testId }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 flex items-center gap-3" data-testid={testId}>
      <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 grid place-items-center">
        <Icon size={18}/>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-semibold text-lg">{value ?? 0}</p>
      </div>
    </div>
  );
}
