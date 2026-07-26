import PageShell, { Section } from '../components/layout/PageShell';
import { Truck, MapPin, Package, Clock } from 'lucide-react';

export default function Shipping() {
  return (
    <PageShell
      testId="page-shipping"
      title="Shipping"
      overline="Client Care"
      description="Free standard shipping on orders above ₹1,499. Two-day express available at checkout. Tracking arrives the moment your parcel leaves our warehouse."
      breadcrumbs={[{ label: 'Client Care' }, { label: 'Shipping' }]}
    >
      <Section title="Rates & timelines" testId="shipping-rates">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Region</th>
                <th className="text-left px-4 py-3 font-semibold">Standard</th>
                <th className="text-left px-4 py-3 font-semibold">Express</th>
                <th className="text-left px-4 py-3 font-semibold">Free above</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {[
                ['India (Metro)',    '2 – 4 business days', '1 – 2 business days', '₹1,499'],
                ['India (Rest)',     '3 – 6 business days', '2 – 3 business days', '₹1,999'],
                ['South Asia',       '5 – 8 business days', '3 – 5 business days', '₹4,999'],
                ['Rest of World',    '7 – 12 business days','4 – 6 business days', '₹9,999'],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-border">
                  {row.map((c, i) => <td key={i} className="px-4 py-3">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="How your order travels" testId="shipping-flow">
        <ol className="space-y-4 pl-0 list-none">
          {[
            { icon: <Package size={18}/>, label: 'Confirmed & packed', body: 'We pick, quality-check and pack your order within 24 hours (working days).' },
            { icon: <Truck size={18}/>,   label: 'On its way',          body: 'You receive an email + SMS with a live tracking link.' },
            { icon: <MapPin size={18}/>,  label: 'Out for delivery',    body: 'A same-day heads-up from our courier partner.' },
            { icon: <Clock size={18}/>,   label: 'Delivered',           body: '48h return window opens automatically for eligible items.' },
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-border">{s.icon}</span>
              <div>
                <p className="font-semibold text-foreground">{s.label}</p>
                <p className="text-sm">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Need to change something?" testId="shipping-changes">
        <p>Reach out within 4 hours of placing your order and we'll do everything possible to update the address. After that we'll help you re-route via our courier partner.</p>
      </Section>
    </PageShell>
  );
}
