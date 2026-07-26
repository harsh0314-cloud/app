/**
 * Full Newsletter Campaigns UI mounted as a tab in the existing Newsletter admin page.
 *  - Compose (subject, rich body, audience selection, preview, test-send)
 *  - Send + real-time progress indicator
 *  - Campaign history with per-campaign analytics
 *
 * Reuses the shared `api` axios instance and StoreX design tokens — no new deps.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, Users, Eye, TestTube, Mail, Trash2, Loader2, X, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import RichTextEditor from '../../../components/admin/RichTextEditor';

const AUDIENCE_OPTIONS = [
  { value: 'ALL',      label: 'All subscribers',    hint: 'Everyone who ever signed up (including unsubscribed).' },
  { value: 'ACTIVE',   label: 'Active subscribers', hint: 'Only currently-subscribed emails.' },
  { value: 'SELECTED', label: 'Selected',           hint: 'Choose specific addresses from your list.' },
];

const STATUS_BADGE = {
  DRAFT:     'bg-gray-100 text-gray-700',
  SENDING:   'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  PARTIAL:   'bg-amber-100 text-amber-800',
  FAILED:    'bg-red-100 text-red-700',
};

function StatChip({ label, value, tone = 'default', icon: Icon }) {
  const tones = {
    default:   'bg-white',
    green:     'bg-emerald-50 text-emerald-900',
    amber:     'bg-amber-50 text-amber-900',
    red:       'bg-red-50 text-red-900',
    blue:      'bg-blue-50 text-blue-900',
  };
  return (
    <div className={`rounded-2xl border border-border p-4 flex items-start justify-between ${tones[tone] || tones.default}`}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </div>
      {Icon && <Icon size={18} className="opacity-40"/>}
    </div>
  );
}

export default function NewsletterCampaigns() {
  // ─── Campaign list state ───────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [viewing, setViewing] = useState(null);

  // ─── Composer state ────────────────────────────────────────────────────
  const [showComposer, setShowComposer] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody]       = useState('');
  const [audience, setAudience] = useState('ALL');
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [subQuery, setSubQuery] = useState('');
  const [preview, setPreview] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progressCampaign, setProgressCampaign] = useState(null);

  const loadCampaigns = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pagination.page), limit: '20' });
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    api.get(`/admin/newsletter/campaigns?${params.toString()}`)
      .then((res) => {
        setCampaigns(res.data.campaigns || []);
        setStats(res.data.stats || stats);
        setPagination(res.data.pagination || pagination);
      })
      .catch(() => toast.error('Failed to load campaigns'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [statusFilter, pagination.page]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  // Poll while any campaign is currently SENDING so the counts update live.
  useEffect(() => {
    const hasSending = campaigns.some((c) => c.status === 'SENDING');
    if (!hasSending) return;
    const t = setInterval(loadCampaigns, 2500);
    return () => clearInterval(t);
  }, [campaigns, loadCampaigns]);

  // Lazy-load subscriber list when the SELECTED audience option is chosen.
  useEffect(() => {
    if (audience !== 'SELECTED' || subscribers.length) return;
    api.get('/admin/newsletter?limit=100&status=SUBSCRIBED')
      .then((res) => setSubscribers(res.data.subscribers || []))
      .catch(() => toast.error('Could not load subscribers'));
    // eslint-disable-next-line
  }, [audience]);

  const filteredSubs = useMemo(
    () => subscribers.filter((s) => s.email.toLowerCase().includes(subQuery.trim().toLowerCase())),
    [subscribers, subQuery]
  );

  const resetComposer = () => {
    setShowComposer(false);
    setSubject(''); setBody(''); setAudience('ALL');
    setSelectedEmails([]); setSubQuery(''); setPreview(false); setTestAddress('');
  };

  const saveDraftAnd = async (afterId) => {
    setSubmitting(true);
    try {
      const payload = { subject, body, audience };
      if (audience === 'SELECTED') payload.selectedEmails = selectedEmails;
      const res = await api.post('/admin/newsletter/campaigns', payload);
      const created = res.data.campaign;
      toast.success('Draft saved');
      if (afterId === 'send')        return handleSend(created);
      if (afterId === 'test')        return handleTest(created);
      resetComposer();
      loadCampaigns();
    } catch (e) {
      toast.error(e.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const handleTest = async (campaign) => {
    const to = window.prompt('Send test email to which address?', testAddress || '');
    if (!to) return;
    try {
      await api.post(`/admin/newsletter/campaigns/${campaign.id}/test`, { to });
      toast.success(`Test sent to ${to}`);
      setTestAddress(to);
    } catch (e) { toast.error(e.message || 'Test failed'); }
  };

  const handleSend = async (campaign) => {
    if (!window.confirm(`Send this campaign to ${campaign.totalRecipients} recipient${campaign.totalRecipients === 1 ? '' : 's'}? This cannot be undone.`)) return;
    try {
      const res = await api.post(`/admin/newsletter/campaigns/${campaign.id}/send`);
      toast.success(res.data.message || 'Sending started');
      setProgressCampaign(campaign.id);
      resetComposer();
      loadCampaigns();
    } catch (e) { toast.error(e.message || 'Send failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await api.delete(`/admin/newsletter/campaigns/${id}`);
      toast.success('Deleted');
      loadCampaigns();
    } catch (e) { toast.error(e.message || 'Delete failed'); }
  };

  const openCampaign = async (id) => {
    try {
      const res = await api.get(`/admin/newsletter/campaigns/${id}`);
      setViewing(res.data.campaign);
    } catch (e) { toast.error(e.message || 'Failed to open'); }
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" data-testid="newsletter-campaigns">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip label="Campaigns"     value={stats.total}   icon={Mail}/>
        <StatChip label="Total Sent"    value={stats.sent}    tone="green"  icon={CheckCircle2}/>
        <StatChip label="Failed"        value={stats.failed}  tone="red"    icon={AlertTriangle}/>
        <StatChip label="Pending"       value={stats.pending} tone="amber"  icon={Clock}/>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="campaign-status-filter"
                  className="px-3 py-2 border border-border rounded-lg text-sm bg-white">
            {['ALL', 'DRAFT', 'SENDING', 'COMPLETED', 'PARTIAL', 'FAILED'].map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowComposer(true)}
          data-testid="new-campaign-btn"
          className="inline-flex items-center gap-2 rounded-lg bg-foreground text-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity"
        >
          <Send size={13}/> New Campaign
        </button>
      </div>

      {loading ? (
        <div className="text-center py-14 text-muted-foreground">Loading campaigns…</div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <Mail size={24} className="mx-auto mb-3 opacity-50"/>
          <p>No campaigns yet. Create your first one to start sending.</p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Subject</th>
                <th className="text-left px-4 py-3 font-semibold">Audience</th>
                <th className="text-left px-4 py-3 font-semibold">Progress</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Sent</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const pct = c.totalRecipients ? Math.round(((c.sentCount + c.failedCount) / c.totalRecipients) * 100) : 0;
                return (
                <tr key={c.id} data-testid={`campaign-row-${c.id}`} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 max-w-xs">
                    <button onClick={() => openCampaign(c.id)} className="text-left w-full">
                      <p className="font-medium text-foreground truncate">{c.subject}</p>
                      <p className="text-xs text-muted-foreground">by {c.createdByName || '—'}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {c.audience === 'ALL' ? 'All' : c.audience === 'ACTIVE' ? 'Active' : 'Selected'} · {c.totalRecipients}
                  </td>
                  <td className="px-4 py-3 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full transition-all ${c.status === 'FAILED' ? 'bg-red-500' : 'bg-foreground'}`} style={{ width: `${pct}%` }} data-testid={`campaign-progress-${c.id}`}/>
                      </div>
                      <span className="text-[11px] text-muted-foreground w-9 text-right">{pct}%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      <span className="text-emerald-700">{c.sentCount} sent</span> · <span className="text-red-600">{c.failedCount} failed</span> · <span>{c.pendingCount} pending</span>
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold ${STATUS_BADGE[c.status] || STATUS_BADGE.DRAFT}`}>
                      {c.status === 'SENDING' && <Loader2 size={10} className="animate-spin mr-1"/>}
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {c.sentAt ? new Date(c.sentAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button onClick={() => openCampaign(c.id)} data-testid={`campaign-view-${c.id}`} className="text-xs inline-flex items-center gap-1 hover:underline"><Eye size={13}/> View</button>
                      {c.status === 'DRAFT' && (
                        <button onClick={() => handleSend(c)} data-testid={`campaign-send-${c.id}`} className="text-xs inline-flex items-center gap-1 text-foreground hover:underline"><Send size={13}/> Send</button>
                      )}
                      {c.status !== 'SENDING' && (
                        <button onClick={() => handleDelete(c.id)} data-testid={`campaign-delete-${c.id}`} className="text-xs inline-flex items-center gap-1 text-red-600 hover:underline"><Trash2 size={13}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</span>
          <div className="flex gap-2">
            <button disabled={pagination.page <= 1}  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} className="rounded border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-muted">Previous</button>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} className="rounded border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-muted">Next</button>
          </div>
        </div>
      )}

      {/* ─── Composer drawer ───────────────────────────────────────────── */}
      {showComposer && (
        <div className="fixed inset-0 z-40 flex" data-testid="campaign-composer">
          <div className="flex-1 bg-black/40" onClick={() => submitting ? null : resetComposer()} />
          <aside className="w-full max-w-3xl bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Create Campaign</p>
                <p className="font-bold text-foreground">{subject || 'New Newsletter Email'}</p>
              </div>
              <button onClick={resetComposer} className="p-2 hover:bg-muted rounded-lg"><X size={16}/></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Subject */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaign Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  data-testid="campaign-subject"
                  placeholder="Enter a compelling subject line…"
                  className="mt-1 w-full px-4 py-2.5 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-foreground"
                />
              </div>

              {/* Body */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Body</label>
                <div className="mt-1">
                  <RichTextEditor value={body} onChange={setBody} testId="campaign-body-editor" />
                </div>
              </div>

              {/* Audience */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Send To</p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      data-testid={`campaign-audience-${opt.value.toLowerCase()}`}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${audience === opt.value ? 'border-foreground bg-muted/40' : 'border-border hover:border-foreground/40'}`}
                    >
                      <input type="radio" checked={audience === opt.value} onChange={() => setAudience(opt.value)} className="mt-0.5 accent-black"/>
                      <span>
                        <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                        <span className="block text-[11px] text-muted-foreground leading-snug">{opt.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Selected subscribers picker */}
              {audience === 'SELECTED' && (
                <div className="border border-border rounded-xl p-4 space-y-3" data-testid="campaign-selected-picker">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Users size={14} className="text-muted-foreground"/>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Choose subscribers ({selectedEmails.length} selected)</p>
                  </div>
                  <input
                    value={subQuery}
                    onChange={(e) => setSubQuery(e.target.value)}
                    placeholder="Search subscribers…"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none"
                  />
                  <div className="max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                    {filteredSubs.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">No subscribers match.</p>
                    ) : filteredSubs.map((s) => {
                      const checked = selectedEmails.includes(s.email);
                      return (
                        <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setSelectedEmails((prev) => e.target.checked ? [...prev, s.email] : prev.filter((x) => x !== s.email))}
                          />
                          <span className="text-sm">{s.email}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
                  <button
                    onClick={() => setPreview((p) => !p)}
                    data-testid="campaign-toggle-preview"
                    className="text-xs inline-flex items-center gap-1 text-foreground hover:underline"
                  >
                    <Eye size={13}/> {preview ? 'Hide preview' : 'Show preview'}
                  </button>
                </div>
                {preview && (
                  <div className="mt-2 rounded-2xl border border-border overflow-hidden">
                    <div className="bg-muted/40 border-b border-border px-4 py-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Subject: </span>{subject || '(no subject)'}
                    </div>
                    <div className="p-4 prose prose-sm max-w-none bg-white" data-testid="campaign-preview-body" dangerouslySetInnerHTML={{ __html: body || '<p style="color:#999">Email body preview…</p>' }}/>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-border pt-5 flex flex-wrap items-center gap-2">
                <button
                  disabled={submitting || !subject || !body.replace(/<[^>]*>/g, '').trim()}
                  onClick={() => saveDraftAnd('draft')}
                  data-testid="campaign-save-draft"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-muted disabled:opacity-40"
                >
                  Save Draft
                </button>
                <button
                  disabled={submitting || !subject || !body.replace(/<[^>]*>/g, '').trim()}
                  onClick={() => saveDraftAnd('test')}
                  data-testid="campaign-send-test"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-muted disabled:opacity-40"
                >
                  <TestTube size={13}/> Send Test
                </button>
                <button
                  disabled={submitting || !subject || !body.replace(/<[^>]*>/g, '').trim() || (audience === 'SELECTED' && !selectedEmails.length)}
                  onClick={() => saveDraftAnd('send')}
                  data-testid="campaign-send-now"
                  className="ml-auto inline-flex items-center gap-2 rounded-lg bg-foreground text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:opacity-90 disabled:opacity-40"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>} Send Now
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ─── Campaign detail drawer ─────────────────────────────────────── */}
      {viewing && (
        <div className="fixed inset-0 z-40 flex" data-testid="campaign-detail">
          <div className="flex-1 bg-black/40" onClick={() => setViewing(null)} />
          <aside className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Campaign</p>
                <p className="font-bold text-foreground">{viewing.subject}</p>
              </div>
              <button onClick={() => setViewing(null)} className="p-2 hover:bg-muted rounded-lg"><X size={16}/></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <StatChip label="Total"   value={viewing.totalRecipients}/>
                <StatChip label="Sent"    value={viewing.sentCount}   tone="green"/>
                <StatChip label="Failed"  value={viewing.failedCount} tone="red"/>
                <StatChip label="Pending" value={viewing.pendingCount} tone="amber"/>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Email body</p>
                <div className="rounded-xl border border-border p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: viewing.body }}/>
              </div>
              {viewing.recipients?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recipients ({viewing.recipients.length})</p>
                  <div className="rounded-xl border border-border max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {viewing.recipients.map((r) => (
                          <tr key={r.id} className="border-b border-border last:border-0">
                            <td className="px-3 py-2">{r.email}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                r.status === 'SENT'   ? 'bg-emerald-100 text-emerald-700' :
                                r.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                              }`}>{r.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
