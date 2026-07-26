import PageShell, { Section } from '../components/layout/PageShell';

const CHART_TOPS = { columns: ['Size', 'Chest (in)', 'Waist (in)', 'Length (in)'], rows: [
  ['XS', '34–36', '28–30', '26'],
  ['S',  '36–38', '30–32', '27'],
  ['M',  '38–40', '32–34', '28'],
  ['L',  '40–42', '34–36', '29'],
  ['XL', '42–44', '36–38', '30'],
  ['XXL','44–46', '38–40', '31'],
]};

const CHART_BOTTOMS = { columns: ['Size', 'Waist (in)', 'Hip (in)', 'Inseam (in)'], rows: [
  ['28', '28', '35', '31'],
  ['30', '30', '37', '31'],
  ['32', '32', '39', '32'],
  ['34', '34', '41', '32'],
  ['36', '36', '43', '32'],
  ['38', '38', '45', '32'],
]};

function Chart({ data, testId }) {
  return (
    <div className="overflow-x-auto" data-testid={testId}>
      <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
        <thead className="bg-muted">
          <tr>{data.columns.map((c) => <th key={c} className="text-left px-4 py-3 font-semibold">{c}</th>)}</tr>
        </thead>
        <tbody className="text-muted-foreground">
          {data.rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((c, j) => (
                <td key={j} className={`px-4 py-3 ${j === 0 ? 'font-semibold text-foreground' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SizeGuide() {
  return (
    <PageShell
      testId="page-size-guide"
      title="Size Guide"
      overline="Client Care"
      description="Every collection is fitted on real bodies. If you're between sizes, size up — our jerseys shrink about half a size on first wash."
      breadcrumbs={[{ label: 'Client Care' }, { label: 'Size Guide' }]}
    >
      <Section title="How to measure" testId="size-how">
        <ol>
          <li><strong>Chest / Bust</strong> — measure the widest part, keeping the tape parallel to the ground.</li>
          <li><strong>Waist</strong> — measure the narrowest part of your torso, usually just above the belly button.</li>
          <li><strong>Hip</strong> — stand feet together, measure around the fullest part of your hips.</li>
          <li><strong>Inseam</strong> — measure from the crotch seam straight down to the ankle.</li>
        </ol>
      </Section>

      <Section title="Tops" testId="size-tops"><Chart data={CHART_TOPS} testId="size-tops-chart"/></Section>
      <Section title="Bottoms" testId="size-bottoms"><Chart data={CHART_BOTTOMS} testId="size-bottoms-chart"/></Section>

      <Section title="Still unsure?" testId="size-help">
        <p>Drop us a note via the <a href="/contact" className="link-underline text-foreground">contact page</a> with a photo of the garment you fit best in and we'll help you pick.</p>
      </Section>
    </PageShell>
  );
}
