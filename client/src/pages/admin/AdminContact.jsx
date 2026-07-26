import { useEffect, useState } from 'react';
import { Search, Trash2, MessageSquare, Archive, MailOpen, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const STATUS_BADGE = {
  NEW:      'bg-amber-100 text-amber-800',
  READ:     'bg-blue-100 text-blue-800',
  ARCHIVED: 'bg-gray-100 text-gray-700',
};

function StatCard({ label, value, tone = 'default' }) {
  const tones = { default: 'bg-white text-gray-900', amber: 'bg-amber-50 text-amber-900' };
  return (
    <div className={`rounded-2xl border border-border p-5 ${tones[tone] || tones.default}`} data-testid={`contact-stat-${label.toLowerCase().replace(/\s+/g,'-')}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

export default function AdminContact() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pagination.page), limit: '20' });
    if (debounced) params.set('q', debounced);
    if (status !== 'ALL') params.set('status', status);
    api.get(`/admin/contact?${params.toString()}`)
      .then((res) => { setRows(res.data.messages || []); setStats(res.data.stats || null); setPagination(res.data.pagination || pagination); })
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [debounced, status, pagination.page]);

  const setStatusOf = async (id, next) => {
    try { await api.patch(`/admin/contact/${id}`, { status: next }); toast.success('Updated'); load(); }
    catch (e) { toast.error(e.message || 'Failed'); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try { await api.delete(`/admin/contact/${id}`); toast.success('Deleted'); setSelected(null); load(); }
    catch (e) { toast.error(e.message || 'Failed'); }
  };

  return (
    <div className="space-y-6" data-testid="admin-contact-page">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3"><MessageSquare size={22}/> Contact Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Notes submitted through the public Contact page.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total"  value={stats.total} />
          <StatCard label="Unread" value={stats.unread} tone="amber"/>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, subject…" data-testid="contact-search" className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-foreground outline-none"/>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="contact-status-filter" className="px-4 py-2.5 border border-border rounded-lg text-sm bg-white min-w-[10rem]">
          {['ALL', 'NEW', 'READ', 'ARCHIVED'].map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <MessageSquare size={24} className="mx-auto mb-3 opacity-50"/>
          <p>No messages yet.</p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">From</th>
                <th className="text-left px-4 py-3 font-semibold">Subject</th>
                <th className="text-left px-4 py-3 font-semibold">Received</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} data-testid={`contact-row-${r.id}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3"><p className="font-medium text-foreground">{r.name}</p><p className="text-xs text-muted-foreground">{r.email}</p></td>
                  <td className="px-4 py-3 max-w-xs"><p className="text-foreground truncate">{r.subject || '(no subject)'}</p><p className="text-xs text-muted-foreground truncate">{r.message}</p></td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-700'}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button onClick={() => { setSelected(r); if (r.status === 'NEW') setStatusOf(r.id, 'READ'); }} data-testid={`contact-view-${r.id}`} className="text-xs inline-flex items-center gap-1 hover:underline"><Eye size={13}/> View</button>
                      <button onClick={() => setStatusOf(r.id, 'ARCHIVED')} data-testid={`contact-archive-${r.id}`} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Archive size={13}/> Archive</button>
                      <button onClick={() => remove(r.id)} data-testid={`contact-delete-${r.id}`} className="text-xs inline-flex items-center gap-1 text-red-600 hover:underline"><Trash2 size={13}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 flex" data-testid="contact-drawer">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)}/>
          <aside className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Message from</p>
                <p className="font-bold text-foreground">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.email}{selected.phone ? ` · ${selected.phone}` : ''}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-muted rounded-lg"><X size={16}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Subject</p>
                <p className="text-foreground">{selected.subject || '(no subject)'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Message</p>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{selected.message}</p>
              </div>
              <div className="flex gap-2 pt-4 border-t border-border">
                <a href={`mailto:${selected.email}?subject=Re:%20${encodeURIComponent(selected.subject || 'Your enquiry')}`} className="inline-flex items-center gap-2 rounded-lg bg-foreground text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide"><MailOpen size={13}/> Reply</a>
                <button onClick={() => setStatusOf(selected.id, 'ARCHIVED')} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-muted"><Archive size={13}/> Archive</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</span>
          <div className="flex gap-2">
            <button disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} className="rounded border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-muted">Previous</button>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} className="rounded border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-muted">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
