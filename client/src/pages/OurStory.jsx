import PageShell, { Section, Grid } from '../components/layout/PageShell';
import { Leaf, Hammer, Globe2, Sparkles } from 'lucide-react';

export default function OurStory() {
  return (
    <PageShell
      testId="page-our-story"
      title="Our Story"
      overline="Maison"
      description="StoreX was built on a simple belief — everyday clothes deserve the same intention as an heirloom. We design in-house, source responsibly, and make things that stay."
      breadcrumbs={[{ label: 'Our Story' }]}
      heroImage="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1400"
    >
      <Section title="A house of considered essentials" testId="story-house">
        <p>What began in a small studio in 2019 has grown into a team of designers, pattern-makers and craftspeople united by one thing — <strong>the honest garment</strong>. No trend cycles. No shortcuts. Just clothes we ourselves want to wear every day.</p>
        <p>Every fabric we use is chosen for its hand, drape and lifespan. Every seam is finished the way our tailors were taught: cleanly, and to last.</p>
      </Section>

      <Section title="What we believe" testId="story-values">
        <Grid columns={4} items={[
          { icon: <Hammer size={18}/>, title: 'Made to last', description: 'Reinforced construction, natural fibres, thoughtful finishing.' },
          { icon: <Leaf size={18}/>,   title: 'Kinder materials', description: 'Organic cotton, TENCEL™ blends and deadstock wovens wherever possible.' },
          { icon: <Globe2 size={18}/>, title: 'Fair partners',    description: 'Small ateliers in Portugal, India and Türkiye — audited, paid, respected.' },
          { icon: <Sparkles size={18}/>, title: 'Design in-house', description: 'Every pattern is drafted by our own team — no white-labels.' },
        ]}/>
      </Section>

      <Section title="Where we are today" testId="story-today">
        <p>Today, StoreX ships to homes in over 30 countries. Our repair service has kept 4,200+ pieces out of landfill. We still design every garment ourselves. Some things won't change.</p>
      </Section>
    </PageShell>
  );
}
