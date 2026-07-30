import { useState, useEffect, useMemo, useCallback } from 'react';
import { Mail, Save, Send, RotateCcw, History, Eye, Code2, CheckCircle2, Copy, X } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import RichTextEditor from '../../components/admin/RichTextEditor';

// Mirrors the server-side email shell so the live preview matches real sends.
const previewShell = (title, bodyHtml) => `
  <div style="background:#f5f5f5;padding:40px 0;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;">
        <tr><td style="background:#111111;padding:24px;text-align:center;"><span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:4px;">STOREX</span></td></tr>
        <tr><td style="padding:36px 40px;color:#111111;"><h1 style="margin:0 0 16px;font-size:20px;font-weight:700;">${title}</h1>${bodyHtml}</td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #eee;color:#999;font-size:12px;text-align:center;">© ${new Date().getFullYear()} StoreX — Considered essentials.</td></tr>
      </table>
    </td></tr></table>
  </div>`;

const renderVars = (str, vars = {}) =>
  String(str || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => (vars[k] != null && vars[k] !== '' ? String(vars[k]) : m));

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [mode, setMode] = useState('visual'); // visual | html
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [versions, setVersions] = useState(null); // null = hidden
  const [dirty, setDirty] = useState(false);

  const loadList = useCallback(() => {
    setLoading(true);
    api.get('/admin/email-templates')
      .then((r) => {
        setTemplates(r.data.templates);
        setSelected((cur) => {
          const next = r.data.templates.find((t) => t.key === cur?.key) || r.data.templates[0];
          return next;
        });
      })
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    if (!selected) return;
    setSubject(selected.subject);
    setBodyHtml(selected.bodyHtml);
    setVersions(null);
    setDirty(false);
  }, [selected?.key, selected?.updatedAt]);

  const sampleVars = useMemo(() => selected?.variables || {}, [selected]);
  const previewHtml = useMemo(
    () => previewShell(renderVars(subject, sampleVars), renderVars(bodyHtml, sampleVars)),
    [subject, bodyHtml, sampleVars]
  );

  const refreshSelected = (template) => {
    setTemplates((ts) => ts.map((t) => (t.key === template.key ? { ...t, ...template } : t)));
    setSelected((s) => ({ ...s, ...template }));
    setDirty(false);
  };

  const saveDraft = async () => {
    if (!subject.trim() || !bodyHtml.trim()) return toast.error('Subject and body are required');
    setSaving(true);
    try {
      const r = await api.put(`/admin/email-templates/${selected.key}`, { subject, bodyHtml });
      refreshSelected(r.data.template);
      toast.success('Draft saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!subject.trim() || !bodyHtml.trim()) return toast.error('Subject and body are required');
    setPublishing(true);
    try {
      const r = await api.post(`/admin/email-templates/${selected.key}/publish`, { subject, bodyHtml });
      refreshSelected(r.data.template);
      toast.success('Template published — it is now live');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const resetDefault = async () => {
    if (!window.confirm('Reset this template to the factory default? Your current content is saved to version history.')) return;
    try {
      const r = await api.post(`/admin/email-templates/${selected.key}/reset`);
      refreshSelected(r.data.template);
      toast.success('Template reset to default');
    } catch {
      toast.error('Reset failed');
    }
  };

  const sendTest = async () => {
    if (!testTo) return toast.error('Enter a recipient email');
    setSendingTest(true);
    try {
      const r = await api.post(`/admin/email-templates/${selected.key}/test`, { to: testTo, subject, bodyHtml });
      if (r.data.sent) toast.success(r.data.message);
      else toast(r.data.message, { icon: 'ℹ️', duration: 6000 });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Test send failed');
    } finally {
      setSendingTest(false);
    }
  };

  const loadVersions = async () => {
    try {
      const r = await api.get(`/admin/email-templates/${selected.key}/versions`);
      setVersions(r.data.versions);
    } catch {
      toast.error('Failed to load versions');
    }
  };

  const restoreVersion = async (id) => {
    try {
      const r = await api.post(`/admin/email-templates/${selected.key}/versions/${id}/restore`);
      refreshSelected(r.data.template);
      setVersions(null);
      toast.success('Version restored');
    } catch {
      toast.error('Restore failed');
    }
  };

  const copyVar = (v) => {
    navigator.clipboard.writeText(`{{${v}}}`);
    toast.success(`{{${v}}} copied — paste it into the subject or body`);
  };

  if (loading) {
    return (
      <div data-testid="admin-email-templates" className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-gray-200/70 dark:bg-gray-700/50" />
        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-gray-200/70 dark:bg-gray-700/50" />)}</div>
          <div className="h-96 animate-pulse rounded-xl bg-gray-200/70 dark:bg-gray-700/50" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="admin-email-templates">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Email Templates</h1>
        <p className="text-sm text-muted-foreground mt-1">Edit, preview, test and publish every transactional email</p>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6 items-start">
        {/* Template list */}
        <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-3 space-y-1" data-testid="template-list">
          {templates.map((t) => (
            <button key={t.key} onClick={() => setSelected(t)} data-testid={`template-item-${t.key}`}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${selected?.key === t.key ? 'bg-foreground text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}>
              <Mail size={15} className="shrink-0" />
              <span className="flex-1 truncate">{t.name}</span>
              {t.isPublished && <CheckCircle2 size={14} className={selected?.key === t.key ? 'text-green-300' : 'text-green-600'} />}
            </button>
          ))}
        </div>

        {selected && (
          <div className="space-y-5 min-w-0">
            {/* Header + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-lg font-bold">{selected.name}</h2>
                <span data-testid="template-status" className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${selected.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {selected.isPublished ? 'Published' : 'Draft'}
                </span>
                {dirty && <span className="text-[11px] text-muted-foreground">unsaved changes</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => (versions ? setVersions(null) : loadVersions())} data-testid="versions-btn"
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors">
                  <History size={14} /> History
                </button>
                <button onClick={resetDefault} data-testid="reset-template-btn"
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors">
                  <RotateCcw size={14} /> Reset Default
                </button>
                <button onClick={saveDraft} disabled={saving} data-testid="save-draft-btn"
                  className="flex items-center gap-1.5 rounded-lg border border-foreground px-4 py-2 text-xs font-semibold hover:bg-foreground hover:text-white transition-colors disabled:opacity-50">
                  <Save size={14} /> {saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button onClick={publish} disabled={publishing} data-testid="publish-btn"
                  className="flex items-center gap-1.5 rounded-lg bg-foreground text-white px-4 py-2 text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                  <CheckCircle2 size={14} /> {publishing ? 'Publishing…' : 'Publish'}
                </button>
              </div>
            </div>

            {/* Version history */}
            {versions && (
              <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-4" data-testid="version-history">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold">Version History</h3>
                  <button onClick={() => setVersions(null)} aria-label="Close history"><X size={16} /></button>
                </div>
                {versions.length ? (
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {versions.map((v) => (
                      <div key={v.id} data-testid={`version-item-${v.version}`} className="flex items-center gap-3 text-sm py-2 border-b border-border last:border-0">
                        <span className="text-xs font-bold text-muted-foreground w-8">v{v.version}</span>
                        <span className="flex-1 truncate">{v.subject}</span>
                        <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString('en-IN')}</span>
                        <button onClick={() => restoreVersion(v.id)} data-testid={`restore-version-${v.version}`}
                          className="text-xs font-semibold underline underline-offset-2 hover:text-foreground">Restore</button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No previous versions yet</p>}
              </div>
            )}

            {/* Variables */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variables:</span>
              {Object.keys(sampleVars).map((v) => (
                <button key={v} onClick={() => copyVar(v)} data-testid={`variable-${v}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-mono hover:border-foreground transition-colors" title={`Sample: ${sampleVars[v] || '—'}`}>
                  {`{{${v}}}`} <Copy size={10} />
                </button>
              ))}
            </div>

            <div className="grid xl:grid-cols-2 gap-5 items-start">
              {/* Editor column */}
              <div className="space-y-4 min-w-0">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
                  <input value={subject} onChange={(e) => { setSubject(e.target.value); setDirty(true); }} data-testid="template-subject-input"
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-foreground outline-none dark:bg-gray-800" />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Body</label>
                    <div className="flex rounded-md border border-border overflow-hidden">
                      <button onClick={() => setMode('visual')} data-testid="mode-visual"
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold ${mode === 'visual' ? 'bg-foreground text-white' : 'text-muted-foreground hover:bg-muted'}`}>
                        <Eye size={11} /> Visual
                      </button>
                      <button onClick={() => setMode('html')} data-testid="mode-html"
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold ${mode === 'html' ? 'bg-foreground text-white' : 'text-muted-foreground hover:bg-muted'}`}>
                        <Code2 size={11} /> HTML
                      </button>
                    </div>
                  </div>
                  {mode === 'visual' ? (
                    <RichTextEditor value={bodyHtml} onChange={(html) => { setBodyHtml(html); setDirty(true); }} placeholder="Write the email body…" testId="template-editor" minHeight="300px" />
                  ) : (
                    <textarea value={bodyHtml} onChange={(e) => { setBodyHtml(e.target.value); setDirty(true); }} data-testid="template-html-textarea"
                      spellCheck={false} rows={14}
                      className="w-full rounded-xl border border-border px-4 py-3 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-foreground outline-none dark:bg-gray-800" />
                  )}
                </div>

                {/* Test email */}
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Send Test Email</p>
                  <div className="flex gap-2">
                    <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" data-testid="test-email-input"
                      className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-foreground outline-none dark:bg-gray-800" />
                    <button onClick={sendTest} disabled={sendingTest} data-testid="send-test-btn"
                      className="flex items-center gap-1.5 rounded-lg bg-foreground text-white px-4 py-2.5 text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                      <Send size={14} /> {sendingTest ? 'Sending…' : 'Send Test'}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">Variables are filled with sample values. The subject is prefixed with [TEST].</p>
                </div>
              </div>

              {/* Live preview */}
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Preview</label>
                <div className="rounded-xl border border-border overflow-hidden bg-[#f5f5f5]" data-testid="template-preview">
                  <div className="border-b border-border bg-white px-4 py-2.5 text-sm dark:bg-gray-800">
                    <span className="text-muted-foreground text-xs">Subject: </span>
                    <span className="font-semibold" data-testid="preview-subject">{renderVars(subject, sampleVars)}</span>
                  </div>
                  <iframe title="Email preview" srcDoc={previewHtml} sandbox="" className="h-[520px] w-full" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
