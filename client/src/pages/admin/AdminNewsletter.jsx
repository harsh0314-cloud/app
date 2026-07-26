import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, Download, Mail, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const STATUS_BADGE = {
  SUBSCRIBED:   'bg-emerald-100 text-emerald-800',
  UNSUBSCRIBED: 'bg-gray-100 text-gray-700',
};

function StatCard({ label, value, tone = 'default' }) {
  const tones = { default: 'bg-white text-gray-900', green: 'bg-emerald-50 text-emerald-900', gray: 'bg-gray-50 text-gray-800' };
  return (
    <div className={`rounded-2xl border border-border p-5 ${tones[tone] || tones.default}`} data-testid={`newsletter-stat-${label.toLowerCase().replace(/\s+/g,'-')}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

export default function AdminNewsletter() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('ALL');

  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pagination.page), limit: '20' });
    if (debounced) params.set('q', debounced);
    if (status !== 'ALL') params.set('status', status);
    api.get(`/admin/newsletter?${params.toString()}`)
      .then((res) => {
        setRows(res.data.subscribers || []);
        setStats(res.data.stats || null);
        setPagination(res.data.pagination || pagination);
      })
      .catch(() => toast.error('Failed to load subscribers'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [debounced, status, pagination.page]);

  const remove = async (id) => {
    if (!window.confirm('Remove this subscriber?')) return;
    try {
      await api.delete(`/admin/newsletter/${id}`);
      toast.success('Removed');
      load();
    } catch (e) { toast.error(e.message || 'Failed to remove'); }
  };

  const exportCsv = async () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (debounced) params.set('q', debounced);
    if (status !== 'ALL') params.set('status', status);
    try {
      const res = await fetch(`${api.defaults.baseURL}/admin/newsletter/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `newsletter-subscribers-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(e.message || 'Export failed'); }
  };

  const setPage = (p) => setPagination((prev) => ({ ...prev, page: p }));

  return (
    <div className="space-y-6" data-testid="admin-newsletter-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3"><Mail size={22}/> Newsletter</h1>
          <p className="text-sm text-muted-foreground mt-1">Everyone who signed up for updates — search, filter, and export.</p>
        </div>
        <button onClick={exportCsv} data-testid="newsletter-export" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors">
          <Download size={13}/> Export CSV
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total"        value={stats.total} />
          <StatCard label="Subscribed"   value={stats.subscribed}   tone="green"/>
          <StatCard label="Unsubscribed" value={stats.unsubscribed} tone="gray"/>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by email…" data-testid="newsletter-search" className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-foreground outline-none"/>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="newsletter-status-filter" className="px-4 py-2.5 border border-border rounded-lg text-sm bg-white min-w-[10rem]">
          {['ALL', 'SUBSCRIBED', 'UNSUBSCRIBED'].map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <Users size={24} className="mx-auto mb-3 opacity-50"/>
          <p>No subscribers match your filter.</p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Source</th>
                <th className="text-left px-4 py-3 font-semibold">Subscribed on</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} data-testid={`newsletter-row-${r.id}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{r.email}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-700'}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{r.source}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.subscribedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(r.id)} data-testid={`newsletter-delete-${r.id}`} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
                      <Trash2 size={13}/> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</span>
          <div className="flex gap-2">
            <button disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)} data-testid="newsletter-prev" className="rounded border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-muted">Previous</button>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)} data-testid="newsletter-next" className="rounded border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-muted">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
