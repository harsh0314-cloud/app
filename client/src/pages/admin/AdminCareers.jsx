import { useEffect, useState } from 'react';
import { Search, Trash2, Briefcase, ExternalLink, FileText, X, Star, CalendarClock, Save, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const STATUS_LIST = ['NEW', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED'];
const STATUS_BADGE = {
  NEW:         'bg-amber-100 text-amber-800',
  REVIEWED:    'bg-blue-100 text-blue-800',
  SHORTLISTED: 'bg-indigo-100 text-indigo-800',
  REJECTED:    'bg-red-100 text-red-800',
  HIRED:       'bg-emerald-100 text-emerald-800',
};

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-border p-5 bg-white" data-testid={`careers-stat-${label.toLowerCase().replace(/\s+/g,'-')}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-2 text-foreground">{value}</p>
    </div>
  );
}

export default function AdminCareers() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [interviewDraft, setInterviewDraft] = useState('');
  const [ratingDraft, setRatingDraft] = useState(0);
  const [savingPrivate, setSavingPrivate] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pagination.page), limit: '20' });
    if (debounced) params.set('q', debounced);
    if (status !== 'ALL') params.set('status', status);
    api.get(`/admin/careers?${params.toString()}`)
      .then((res) => { setRows(res.data.applications || []); setStats(res.data.stats || null); setPagination(res.data.pagination || pagination); })
      .catch(() => toast.error('Failed to load applications'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [debounced, status, pagination.page]);

  const openDrawer = (app) => {
    setSelected(app);
    setNotesDraft(app.internalNotes || '');
    setRatingDraft(app.rating || 0);
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    setInterviewDraft(app.interviewScheduledAt
      ? new Date(app.interviewScheduledAt).toISOString().slice(0, 16)
      : '');
  };

  const setStatusOf = async (id, next) => {
    try { await api.patch(`/admin/careers/${id}`, { status: next }); toast.success('Updated'); load(); }
    catch (e) { toast.error(e.message || 'Failed'); }
  };

  const savePrivate = async () => {
    if (!selected) return;
    setSavingPrivate(true);
    try {
      const res = await api.patch(`/admin/careers/${selected.id}`, {
        rating:               ratingDraft || null,
        internalNotes:        notesDraft,
        interviewScheduledAt: interviewDraft || null,
      });
      const updated = res.data.application;
      setSelected(updated);
      toast.success('Private notes saved');
      load();
    } catch (e) {
      toast.error(e.message || 'Save failed');
    } finally { setSavingPrivate(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this application?')) return;
    try { await api.delete(`/admin/careers/${id}`); toast.success('Deleted'); setSelected(null); load(); }
    catch (e) { toast.error(e.message || 'Failed'); }
  };

  return (
    <div className="space-y-6" data-testid="admin-careers-page">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3"><Briefcase size={22}/> Job Applications</h1>
        <p className="text-sm text-muted-foreground mt-1">People who applied via the Careers page.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total"       value={stats.total}/>
          <StatCard label="New"         value={stats.new}/>
          <StatCard label="Reviewed"    value={stats.reviewed}/>
          <StatCard label="Shortlisted" value={stats.shortlisted}/>
          <StatCard label="Hired"       value={stats.hired}/>
          <StatCard label="Rejected"    value={stats.rejected}/>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, position…" data-testid="careers-search" className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-foreground outline-none"/>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="careers-status-filter" className="px-4 py-2.5 border border-border rounded-lg text-sm bg-white min-w-[10rem]">
          {['ALL', ...STATUS_LIST].map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <Briefcase size={24} className="mx-auto mb-3 opacity-50"/>
          <p>No applications match.</p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Applicant</th>
                <th className="text-left px-4 py-3 font-semibold">Position</th>
                <th className="text-left px-4 py-3 font-semibold">Received</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} data-testid={`career-row-${r.id}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3"><p className="font-medium text-foreground">{r.name}</p><p className="text-xs text-muted-foreground">{r.email}{r.phone ? ` · ${r.phone}` : ''}</p></td>
                  <td className="px-4 py-3 text-foreground">{r.position}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-4 py-3">
                    <select value={r.status} onChange={(e) => setStatusOf(r.id, e.target.value)} data-testid={`career-status-select-${r.id}`} className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      {r.rating > 0 && (
                        <span data-testid={`career-rating-cell-${r.id}`} className="inline-flex items-center gap-0.5 text-amber-500" title={`Rating: ${r.rating}/5`}>
                          <Star size={12} className="fill-amber-400 text-amber-400"/>
                          <span className="text-[11px] font-semibold text-foreground">{r.rating}</span>
                        </span>
                      )}
                      {r.interviewScheduledAt && (
                        <span data-testid={`career-interview-cell-${r.id}`} className="inline-flex items-center gap-1 text-[11px] text-indigo-700" title="Interview scheduled">
                          <CalendarClock size={12}/>
                        </span>
                      )}
                      <button onClick={() => openDrawer(r)} data-testid={`career-view-${r.id}`} className="text-xs inline-flex items-center gap-1 hover:underline">View</button>
                      {r.resumeUrl && <a href={r.resumeUrl} target="_blank" rel="noreferrer" data-testid={`career-resume-${r.id}`} className="text-xs inline-flex items-center gap-1 text-foreground hover:underline"><FileText size={13}/> Resume</a>}
                      <button onClick={() => remove(r.id)} data-testid={`career-delete-${r.id}`} className="text-xs inline-flex items-center gap-1 text-red-600 hover:underline"><Trash2 size={13}/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 flex" data-testid="careers-drawer">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)}/>
          <aside className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Applicant</p>
                <p className="font-bold text-foreground">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.email}{selected.phone ? ` · ${selected.phone}` : ''}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-muted rounded-lg"><X size={16}/></button>
            </div>
            <div className="p-6 space-y-5">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Applying for</p><p className="text-foreground">{selected.position}</p></div>
              {selected.coverLetter && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">A short note</p><p className="text-foreground whitespace-pre-wrap leading-relaxed">{selected.coverLetter}</p></div>}
              <div className="flex flex-wrap gap-2">
                {selected.linkedin && <a href={selected.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs rounded-lg border border-border px-3 py-2 hover:bg-muted"><ExternalLink size={13}/> LinkedIn</a>}
                {selected.portfolio && <a href={selected.portfolio} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs rounded-lg border border-border px-3 py-2 hover:bg-muted"><ExternalLink size={13}/> Portfolio</a>}
                {selected.resumeUrl && <a href={selected.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs rounded-lg bg-foreground text-white px-3 py-2"><FileText size={13}/> View resume</a>}
              </div>

              {/* ─── PRIVATE ADMIN SECTION — never surfaced to applicant ─── */}
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-4" data-testid="private-admin-notes">
                <div className="flex items-center gap-2 text-amber-900">
                  <Lock size={14}/>
                  <p className="text-xs font-semibold uppercase tracking-wider">Private — Admins only</p>
                </div>

                {/* Status shortcuts */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pipeline status</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {STATUS_LIST.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusOf(selected.id, s)}
                        data-testid={`career-set-status-${s.toLowerCase()}-${selected.id}`}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-colors ${selected.status === s ? STATUS_BADGE[s] || 'bg-foreground text-white' : 'bg-white border border-border text-muted-foreground hover:text-foreground'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Star rating */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rating</label>
                  <div className="mt-1 flex items-center gap-1" data-testid="career-rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setRatingDraft(ratingDraft === n ? 0 : n)}
                        data-testid={`career-rating-star-${n}`}
                        title={`${n} star${n === 1 ? '' : 's'}`}
                        className="p-1 rounded hover:bg-amber-100 transition-colors"
                      >
                        <Star size={20} className={n <= ratingDraft ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}/>
                      </button>
                    ))}
                    {ratingDraft > 0 && <button onClick={() => setRatingDraft(0)} className="ml-2 text-[11px] text-muted-foreground hover:text-foreground">Clear</button>}
                  </div>
                </div>

                {/* Interview date/time */}
                <div>
                  <label htmlFor="career-interview" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Interview scheduled</label>
                  <div className="mt-1 flex items-center gap-2">
                    <CalendarClock size={14} className="text-muted-foreground"/>
                    <input
                      id="career-interview"
                      type="datetime-local"
                      value={interviewDraft}
                      onChange={(e) => setInterviewDraft(e.target.value)}
                      data-testid="career-interview-input"
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-foreground"
                    />
                    {interviewDraft && <button onClick={() => setInterviewDraft('')} className="text-[11px] text-muted-foreground hover:text-foreground">Clear</button>}
                  </div>
                </div>

                {/* Internal notes */}
                <div>
                  <label htmlFor="career-notes" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Internal notes</label>
                  <textarea
                    id="career-notes"
                    rows={5}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    data-testid="career-internal-notes"
                    placeholder="Interview feedback, red flags, follow-ups… (only admins see this)"
                    className="mt-1 w-full px-3 py-2 border border-border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-foreground resize-y leading-relaxed"
                  />
                </div>

                <button
                  onClick={savePrivate}
                  disabled={savingPrivate}
                  data-testid="save-private-notes-btn"
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {savingPrivate ? 'Saving…' : <><Save size={13}/> Save private notes</>}
                </button>
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
