import PageShell, { Section, Grid } from '../components/layout/PageShell';
import { Recycle, TreePine, Droplet, PackageOpen } from 'lucide-react';

export default function Sustainability() {
  return (
    <PageShell
      testId="page-sustainability"
      title="Sustainability"
      overline="Responsibility"
      description="A garment's biggest impact is the years it spends in your wardrobe. Everything we do is aimed at making that span as long — and as gentle — as possible."
      breadcrumbs={[{ label: 'Sustainability' }]}
      heroImage="https://images.unsplash.com/photo-1520975916090-3105956dac38?w=1400"
    >
      <Section title="Our commitments" testId="sus-commitments">
        <Grid columns={4} items={[
          { icon: <TreePine size={18}/>, title: 'Preferred fibres', description: '78% of our SS26 collection uses organic, recycled or regenerative fibres.' },
          { icon: <Droplet size={18}/>,  title: 'Water first',       description: 'All indigo denim is dyed with a closed-loop system that saves 20L per garment.' },
          { icon: <Recycle size={18}/>,  title: 'Take-back',         description: 'Send any StoreX piece back at end-of-life — we resell, repair or recycle it.' },
          { icon: <PackageOpen size={18}/>, title: 'Plastic-free packaging', description: 'FSC-certified cartons, sugarcane mailers, water-based inks.' },
        ]}/>
      </Section>

      <Section title="Traceable, always" testId="sus-traceable">
        <p>Every product page lists its country of manufacture, primary mill and fibre composition. If it's on a garment, you should know where it came from.</p>
      </Section>

      <Section title="What's next" testId="sus-next">
        <ul>
          <li>2026 goal — 90% of collection made from preferred fibres.</li>
          <li>2027 goal — every packaging item home-compostable.</li>
          <li>Ongoing — invest 1% of revenue into fibre-recovery R&amp;D.</li>
        </ul>
      </Section>
    </PageShell>
  );
}
