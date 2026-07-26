import { Link } from 'react-router-dom';
import PageShell, { Section, Grid } from '../components/layout/PageShell';
import { RotateCcw, PackageCheck, Wallet, Ticket, Ruler } from 'lucide-react';

export default function ReturnsPolicy() {
  return (
    <PageShell
      testId="page-returns-policy"
      title="Returns & Exchange"
      overline="Client Care"
      description="Free returns and size exchanges within 15 days of delivery on all eligible items. Simple, honest, and processed within 72 hours of pickup."
      breadcrumbs={[{ label: 'Client Care' }, { label: 'Returns & Exchange' }]}
    >
      <Section title="How it works" testId="returns-how">
        <Grid columns={4} items={[
          { icon: <RotateCcw size={18}/>, title: 'Request', description: 'From My Orders → Return / Exchange. Pick items, reason, and (optional) photos.' },
          { icon: <PackageCheck size={18}/>, title: 'Pickup', description: 'We arrange a courier pickup at a slot that suits you — no printouts needed.' },
          { icon: <Wallet size={18}/>, title: 'Refund', description: 'Choose your original payment, store wallet, or a store-credit coupon.' },
          { icon: <Ruler size={18}/>, title: 'Exchange', description: 'Pick a new size — we reserve it the moment we approve your request.' },
        ]}/>
      </Section>

      <Section title="What's eligible" testId="returns-eligible">
        <ul>
          <li>Delivered orders, within the return window shown on each product page (default 15 days).</li>
          <li>Item is unused, unwashed, with original tags and packaging.</li>
          <li>Product is marked as returnable/exchangeable (a small number of items — underwear, altered pieces, final-sale — are not).</li>
        </ul>
      </Section>

      <Section title="Refund methods" testId="returns-refund">
        <Grid columns={3} items={[
          { icon: <Wallet size={18}/>, title: 'Original payment', description: 'Back to the card / UPI / netbanking you used. 5–7 business days.' },
          { icon: <Wallet size={18}/>, title: 'Store wallet', description: 'Instant credit — usable on your next order at StoreX.' },
          { icon: <Ticket size={18}/>, title: 'Store credit coupon', description: 'A single-use coupon valid for 12 months.' },
        ]}/>
      </Section>

      <Section title="Ready to get started?" testId="returns-cta">
        <p>Head to <Link to="/orders" className="link-underline text-foreground">My Orders</Link> and open the order you'd like a return or exchange for. If you already submitted a request, you can track it under <Link to="/returns" className="link-underline text-foreground">Returns &amp; Exchanges</Link>.</p>
      </Section>
    </PageShell>
  );
}
