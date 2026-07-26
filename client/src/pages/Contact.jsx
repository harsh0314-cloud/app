import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import PageShell, { Section } from '../components/layout/PageShell';

const FAQS = [
  { q: 'How long does shipping take?',                   a: '2–4 business days for metro India, 3–6 for the rest of India, 5–8 for South Asia, 7–12 for international. Full breakdown lives on the Shipping page.' },
  { q: 'Do you offer alterations?',                      a: 'Yes — we partner with local ateliers in Mumbai, Delhi and Bengaluru. Contact us within 7 days of delivery to arrange complimentary length + waist alterations.' },
  { q: 'Can I gift-wrap an order?',                      a: 'Absolutely. Just leave a note at checkout and choose the “Gift wrap” option. It’s free.' },
  { q: 'How do I track a return or exchange?',           a: 'Sign in and open Returns & Exchanges from your profile — every step of the journey is logged there.' },
  { q: 'Where are your clothes made?',                   a: 'Every product page lists its country of manufacture and mill. Most of our pieces are made in small ateliers in India, Portugal and Türkiye.' },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/contact', form);
      toast.success('Message sent — we\'ll get back to you soon.');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.message || 'Could not send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      testId="page-contact"
      title="Contact"
      overline="Client Care"
      description="Have a question, a note, or something more curious to share? Our client-care team reads every message. We usually reply within one business day."
      breadcrumbs={[{ label: 'Contact' }]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 py-10 border-t border-border">
        {/* Info panel */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-border p-6 bg-card" data-testid="contact-info">
            <p className="overline text-muted-foreground">Reach us</p>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex items-start gap-3"><Mail size={16} className="mt-0.5"/><div><p className="text-foreground font-medium">hello@storex.example</p><p className="text-xs text-muted-foreground">General enquiries</p></div></li>
              <li className="flex items-start gap-3"><Phone size={16} className="mt-0.5"/><div><p className="text-foreground font-medium">+91 80 4711 0022</p><p className="text-xs text-muted-foreground">Mon–Sat · 10:00–19:00 IST</p></div></li>
              <li className="flex items-start gap-3"><MapPin size={16} className="mt-0.5"/><div><p className="text-foreground font-medium">StoreX Atelier</p><p className="text-xs text-muted-foreground">14 Church Street, Bengaluru 560001, India</p></div></li>
              <li className="flex items-start gap-3"><Clock size={16} className="mt-0.5"/><div><p className="text-foreground font-medium">Business hours</p><p className="text-xs text-muted-foreground">Mon–Sat · 10:00–19:00 IST · Closed on Sundays</p></div></li>
            </ul>
          </div>
        </aside>

        {/* Form */}
        <form onSubmit={submit} className="lg:col-span-2 rounded-2xl border border-border p-6 bg-card space-y-4" data-testid="contact-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Name*</span>
              <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="contact-name" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:border-foreground outline-none"/>
            </label>
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Email*</span>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="contact-email" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:border-foreground outline-none"/>
            </label>
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Phone</span>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="contact-phone" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:border-foreground outline-none"/>
            </label>
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Subject</span>
              <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} data-testid="contact-subject" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:border-foreground outline-none"/>
            </label>
          </div>
          <label className="text-xs text-muted-foreground block">
            <span className="block mb-1">Message*</span>
            <textarea required rows={5} minLength={5} maxLength={4000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="contact-message" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:border-foreground outline-none"/>
          </label>
          <button type="submit" disabled={submitting} data-testid="contact-submit" className="inline-flex items-center gap-2 rounded-xl bg-foreground text-white px-6 py-3 text-xs font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-50">
            <Send size={14}/> {submitting ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </div>

      <Section title="Frequently asked" testId="contact-faq">
        <ul className="divide-y divide-border" data-testid="faq-list">
          {FAQS.map((f, i) => (
            <li key={f.q} className="py-4">
              <button type="button" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="w-full text-left flex items-start justify-between gap-4" data-testid={`faq-toggle-${i}`}>
                <span className="text-foreground font-medium">{f.q}</span>
                <span className="text-muted-foreground text-lg leading-none">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <p className="mt-2 text-sm text-muted-foreground pr-8" data-testid={`faq-answer-${i}`}>{f.a}</p>}
            </li>
          ))}
        </ul>
      </Section>
    </PageShell>
  );
}
