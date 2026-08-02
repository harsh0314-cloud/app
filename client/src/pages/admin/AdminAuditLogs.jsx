import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { Search, Filter, Download, RefreshCw, ExternalLink, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILURE: 'bg-red-50 text-red-700 border-red-200',
};

const initialFilters = { search: '', action: '', entity: '', userRole: '', userEmail: '', status: '', ipAddress: '', from: '', to: '' };

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [meta, setMeta] = useState({ actions: [], entities: [], roles: [], users: [] });
  const [stats, setStats] = useState({ total: 0, last24h: 0, last7d: 0, failures: 0, topActions: [] });
  const [selected, setSelected] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    api.get('/admin/audit-logs/filters').then((r) => setMeta(r.data)).catch(() => {});
    api.get('/admin/audit-logs/stats').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchLogs(1, applied); }, [applied]);

  const fetchLogs = async (page, f = applied) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/admin/audit-logs?${params}`);
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { page, limit: 25, total: 0, totalPages: 1 });
    } catch (e) { toast.error(e.message || 'Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  const doExport = async (format) => {
    try {
      const params = new URLSearchParams({ format });
      Object.entries(applied).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/admin/audit-logs/export?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(e.message || 'Export failed'); }
  };

  const openDetail = async (log) => {
    setSelected(log);
    setNotesDraft(log.adminNotes || '');
  };
  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      const res = await api.patch(`/admin/audit-logs/${selected.id}`, { adminNotes: notesDraft });
      setSelected(res.data.log);
      setLogs((prev) => prev.map((l) => (l.id === res.data.log.id ? res.data.log : l)));
      toast.success('Notes saved');
    } catch (e) { toast.error(e.message || 'Failed to save notes'); }
    finally { setSavingNotes(false); }
  };

  const statCards = useMemo(() => ([
    { label: 'Total events',     value: stats.total.toLocaleString() },
    { label: 'Last 24 hours',    value: stats.last24h.toLocaleString() },
    { label: 'Last 7 days',      value: stats.last7d.toLocaleString() },
    { label: 'Failures',         value: stats.failures.toLocaleString(), tone: stats.failures ? 'red' : null },
  ]), [stats]);

  return (
    <div className="space-y-6" data-testid="admin-audit-logs">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Permanent activity trail. Logs are never auto-deleted.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchLogs(pagination.page)} data-testid="audit-refresh-btn" className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-800">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => doExport('csv')} data-testid="audit-export-csv-btn" className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-foreground text-white hover:opacity-90">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => doExport('xlsx')} data-testid="audit-export-xlsx-btn" className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:opacity-90">
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="border border-border rounded-xl p-4 bg-white dark:bg-gray-800">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.tone === 'red' ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="border border-border rounded-xl bg-white dark:bg-gray-800 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <Filter size={14} /> Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search email, IP, message…" data-testid="audit-search-input"
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-transparent"/>
          </div>
          <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} data-testid="audit-action-select" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent">
            <option value="">All actions</option>
            {meta.actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filters.entity} onChange={(e) => setFilters({ ...filters, entity: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent">
            <option value="">All entities</option>
            {meta.entities.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filters.userRole} onChange={(e) => setFilters({ ...filters, userRole: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent">
            <option value="">All roles</option>
            {meta.roles.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="email" value={filters.userEmail} onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })} placeholder="Exact user email" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent"/>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent">
            <option value="">Any status</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>
          <input type="text" value={filters.ipAddress} onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value })} placeholder="IP address" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent"/>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} data-testid="audit-from-date" className="w-full px-2 py-2 border border-border rounded-lg text-sm bg-transparent"/>
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} data-testid="audit-to-date" className="w-full px-2 py-2 border border-border rounded-lg text-sm bg-transparent"/>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setApplied({ ...filters })} data-testid="audit-apply-filters-btn" className="px-4 py-2 rounded-lg bg-foreground text-white text-sm font-medium hover:opacity-90">Apply</button>
          <button onClick={() => { setFilters(initialFilters); setApplied(initialFilters); }} data-testid="audit-clear-filters-btn" className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Clear</button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">When</th>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Entity</th>
                <th className="text-left px-4 py-3 font-semibold">IP</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No audit events match your filters.</td></tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40" data-testid={`audit-row-${l.id}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{l.userName || '—'}</div>
                    <div className="text-xs text-muted-foreground">{l.userEmail || 'system'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{l.userRole || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-3 text-xs">
                    {l.entity ? <div>{l.entity}</div> : '—'}
                    {l.entityId && <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">{l.entityId}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">{l.ipAddress || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLES[l.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openDetail(l)} data-testid={`audit-view-${l.id}`} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="View">
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
          <span>{pagination.total.toLocaleString()} events</span>
          <div className="flex items-center gap-2">
            <button disabled={pagination.page <= 1} onClick={() => fetchLogs(pagination.page - 1)} className="px-2 py-1 border border-border rounded disabled:opacity-40">Prev</button>
            <span>Page {pagination.page} / {pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchLogs(pagination.page + 1)} className="px-2 py-1 border border-border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={() => setSelected(null)} data-testid="audit-detail-overlay">
          <div className="w-full max-w-lg h-full bg-white dark:bg-gray-800 shadow-xl p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{selected.action}</h3>
                <p className="text-xs text-muted-foreground">{new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18}/></button>
            </div>
            <dl className="space-y-3 text-sm">
              <Row label="User"     value={`${selected.userName || '—'} (${selected.userEmail || 'system'})`} />
              <Row label="Role"     value={selected.userRole || '—'} />
              <Row label="Entity"   value={selected.entity ? `${selected.entity} · ${selected.entityId || ''}` : '—'} />
              <Row label="Status"   value={selected.status} />
              <Row label="Message"  value={selected.message || '—'} />
              <Row label="IP"       value={selected.ipAddress || '—'} />
              <Row label="Browser"  value={selected.browser || '—'} />
              <Row label="Device"   value={selected.device || '—'} />
              <Row label="Previous" value={selected.previousValue ? <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded max-h-40 overflow-auto">{JSON.stringify(selected.previousValue, null, 2)}</pre> : '—'} />
              <Row label="New"      value={selected.newValue ? <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded max-h-40 overflow-auto">{JSON.stringify(selected.newValue, null, 2)}</pre> : '—'} />
            </dl>
            <div className="mt-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Admin notes</label>
              <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={4} data-testid="audit-notes-input" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent" placeholder="Add investigation notes (optional)…"/>
              <div className="mt-2 flex justify-end">
                <button onClick={saveNotes} disabled={savingNotes} data-testid="audit-save-notes-btn" className="px-4 py-2 text-sm rounded-lg bg-foreground text-white disabled:opacity-50">{savingNotes ? 'Saving…' : 'Save notes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">{value}</dd>
    </div>
  );
}
