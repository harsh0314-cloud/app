import { Download, Mail, Newspaper, Palette } from 'lucide-react';
import PageShell, { Section, Grid } from '../components/layout/PageShell';

const COVERAGE = [
  { date: 'Feb 2026', outlet: 'Vogue India', headline: 'StoreX and the return of the honest garment' },
  { date: 'Jan 2026', outlet: 'Business of Fashion', headline: 'How StoreX built a repair service that pays for itself' },
  { date: 'Nov 2025', outlet: 'Financial Times HTSI', headline: 'The small-batch labels quietly redefining Indian menswear' },
  { date: 'Sep 2025', outlet: 'Grazia', headline: 'The 10 pieces in every editor\'s cart this season' },
];

export default function Press() {
  return (
    <PageShell
      testId="page-press"
      title="Press"
      overline="Maison"
      description="For interviews, imagery or product loans, please reach out to our press office. We usually respond within one business day."
      breadcrumbs={[{ label: 'Press' }]}
    >
      <Section title="In the news" testId="press-coverage">
        <ul className="divide-y divide-border" data-testid="press-coverage-list">
          {COVERAGE.map((c) => (
            <li key={c.headline} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-luxe-sm text-muted-foreground">{c.date} · {c.outlet}</p>
                <p className="text-foreground font-medium mt-1">{c.headline}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Newspaper size={13}/> Read</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Media kit" testId="press-media-kit">
        <Grid columns={3} items={[
          { icon: <Download size={18}/>, title: 'Brand logos', description: 'SVG + PNG in light and dark variants. Please keep clear-space intact.' },
          { icon: <Palette size={18}/>,  title: 'Colour system', description: 'Primary neutrals, accent tones, and hex values used across StoreX.' },
          { icon: <Newspaper size={18}/>, title: 'Fact sheet',   description: 'Founding story, key milestones, sustainability commitments — all one PDF.' },
        ]}/>
        <p className="text-sm text-muted-foreground mt-4">Assets are available on request while we finalise the public download portal — email us and we'll send a Dropbox link.</p>
      </Section>

      <Section title="Press office" testId="press-contact">
        <p className="inline-flex items-center gap-2 text-foreground"><Mail size={16}/> press@storex.example</p>
        <p className="text-sm mt-1">Kavya Rao · Head of Communications, StoreX</p>
      </Section>
    </PageShell>
  );
}
