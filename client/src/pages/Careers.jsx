import { useState } from 'react';
import { Heart, Sparkles, Users2, Send, UploadCloud, FileCheck2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import PageShell, { Section, Grid } from '../components/layout/PageShell';

const OPEN_ROLES = [
  { position: 'Senior Product Designer',  location: 'Bengaluru · Full-time',   summary: 'Own end-to-end product design for a category — from mood board to sample review.' },
  { position: 'Merchandising Manager',    location: 'Bengaluru · Full-time',   summary: 'Shape our seasonal buy, hold the P&L for two categories, and steer forward planning.' },
  { position: 'Fabric Sourcing Lead',     location: 'Bengaluru · Full-time',   summary: 'Build our preferred-fibre pipeline; audit and grow our mill network in South Asia.' },
  { position: 'Client Care Associate',    location: 'Remote (India) · Full-time', summary: 'Be the human on the other end of every hello — email, chat, phone.' },
  { position: 'Studio Photographer',      location: 'Bengaluru · Contract',    summary: 'Shoot 30–60 SKUs a week in-house — flat lays, product on-figure, and editorial capsules.' },
];

export default function Careers() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', position: OPEN_ROLES[0].position,
    coverLetter: '', linkedin: '', portfolio: '',
    resumeUrl: '', resumePublicId: '',
  });
  const [resumeName, setResumeName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const uploadResume = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Resume must be 10 MB or smaller.'); e.target.value = ''; return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const res = await api.post('/careers/upload-resume', fd);
      const r = res.data?.resume;
      setField('resumeUrl', r.url);
      setField('resumePublicId', r.publicId || '');
      setResumeName(file.name);
      toast.success('Resume uploaded.');
    } catch (err) {
      toast.error(err.message || 'Resume upload failed. You may submit without one.');
    } finally { setUploading(false); e.target.value = ''; }
  };

  const removeResume = () => { setField('resumeUrl', ''); setField('resumePublicId', ''); setResumeName(''); };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/careers/apply', form);
      toast.success('Application received — thank you.');
      setForm({ name: '', email: '', phone: '', position: OPEN_ROLES[0].position, coverLetter: '', linkedin: '', portfolio: '', resumeUrl: '', resumePublicId: '' });
      setResumeName('');
    } catch (err) {
      toast.error(err.message || 'Could not send application.');
    } finally { setSubmitting(false); }
  };

  return (
    <PageShell
      testId="page-careers"
      title="Careers"
      overline="Maison"
      description="We are a small, curious team building things we care about. If you love craft, love clothes, and want to build the next great Indian house — we would love to hear from you."
      breadcrumbs={[{ label: 'Careers' }]}
    >
      <Section title="What it's like to work here" testId="careers-culture">
        <Grid columns={3} items={[
          { icon: <Heart size={18}/>,   title: 'Craft first',      description: 'Every idea starts on a pattern table, not a spreadsheet.' },
          { icon: <Sparkles size={18}/>, title: 'Room to build',   description: 'You own outcomes end-to-end. Real autonomy, real responsibility.' },
          { icon: <Users2 size={18}/>,   title: 'A small team',    description: '32 people today — every hire matters, every voice heard.' },
        ]}/>
      </Section>

      <Section title="Open roles" testId="careers-open-roles">
        <ul className="divide-y divide-border" data-testid="careers-role-list">
          {OPEN_ROLES.map((r) => (
            <li key={r.position} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-testid={`career-role-${r.position.replace(/\s+/g, '-').toLowerCase()}`}>
              <div>
                <p className="font-semibold text-foreground">{r.position}</p>
                <p className="text-xs uppercase tracking-luxe-sm text-muted-foreground">{r.location}</p>
                <p className="text-sm text-muted-foreground mt-1">{r.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => { setField('position', r.position); document.getElementById('careers-apply')?.scrollIntoView({ behavior: 'smooth' }); }}
                data-testid={`career-apply-${r.position.replace(/\s+/g, '-').toLowerCase()}`}
                className="border border-foreground px-4 py-2 text-[11px] font-semibold uppercase tracking-luxe-sm hover:bg-foreground hover:text-white transition-colors"
              >
                Apply
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Apply" testId="careers-apply-section">
        <form id="careers-apply" onSubmit={submit} className="rounded-2xl border border-border p-6 bg-card space-y-4" data-testid="careers-apply-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Full name*</span>
              <input required type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} data-testid="career-name" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:border-foreground outline-none"/>
            </label>
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Email*</span>
              <input required type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} data-testid="career-email" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:border-foreground outline-none"/>
            </label>
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Phone</span>
              <input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} data-testid="career-phone" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:border-foreground outline-none"/>
            </label>
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Applying for*</span>
              <select required value={form.position} onChange={(e) => setField('position', e.target.value)} data-testid="career-position" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:border-foreground outline-none bg-white">
                {OPEN_ROLES.map((r) => <option key={r.position} value={r.position}>{r.position}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">LinkedIn</span>
              <input type="url" value={form.linkedin} onChange={(e) => setField('linkedin', e.target.value)} data-testid="career-linkedin" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:border-foreground outline-none" placeholder="https://linkedin.com/in/…"/>
            </label>
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Portfolio / website</span>
              <input type="url" value={form.portfolio} onChange={(e) => setField('portfolio', e.target.value)} data-testid="career-portfolio" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:border-foreground outline-none" placeholder="https://…"/>
            </label>
          </div>

          <label className="text-xs text-muted-foreground block">
            <span className="block mb-1">A short note</span>
            <textarea rows={4} maxLength={2000} value={form.coverLetter} onChange={(e) => setField('coverLetter', e.target.value)} data-testid="career-cover-letter" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:border-foreground outline-none" placeholder="Tell us what you'd love to work on."/>
          </label>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Resume (PDF or DOC, up to 10 MB)</p>
            {form.resumeUrl ? (
              <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/40" data-testid="career-resume-current">
                <div className="flex items-center gap-2 text-sm">
                  <FileCheck2 size={16} className="text-emerald-600"/>
                  <span className="truncate max-w-[16rem]">{resumeName || 'Uploaded resume'}</span>
                </div>
                <button type="button" onClick={removeResume} data-testid="career-resume-remove" className="text-muted-foreground hover:text-foreground"><X size={14}/></button>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-border rounded-lg px-4 py-6 cursor-pointer hover:border-foreground transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`} data-testid="career-resume-upload-label">
                <UploadCloud size={16}/>
                <span className="text-sm">{uploading ? 'Uploading…' : 'Attach resume'}</span>
                <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={uploadResume} disabled={uploading} className="hidden" data-testid="career-resume-input"/>
              </label>
            )}
          </div>

          <button type="submit" disabled={submitting} data-testid="career-submit" className="inline-flex items-center gap-2 rounded-xl bg-foreground text-white px-6 py-3 text-xs font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-50">
            <Send size={14}/> {submitting ? 'Submitting…' : 'Send application'}
          </button>
        </form>
      </Section>
    </PageShell>
  );
}
