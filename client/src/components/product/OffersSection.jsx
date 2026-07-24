import { Percent, CreditCard, Tag, Gift } from 'lucide-react';

const OFFERS = [
  { icon: Percent, title: '5% Prepaid Discount', desc: 'Extra 5% off on prepaid orders' },
  { icon: Gift, title: 'Buy 2 Get 10% Off', desc: 'Add any 2 items to unlock' },
  { icon: CreditCard, title: 'Bank Offer', desc: '10% off on select bank cards' },
  { icon: Tag, title: 'Coupon: STOREX100', desc: '₹100 off on orders above ₹999' },
];

export default function OffersSection() {
  return (
    <div className="mt-8" data-testid="offers-section">
      <h3 className="text-[11px] font-semibold uppercase tracking-luxe-sm">Save extra with these offers</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OFFERS.map((o) => (
          <div key={o.title} className="flex items-start gap-3 border border-border p-4 transition-colors hover:border-foreground">
            <o.icon size={18} className="mt-0.5 shrink-0 text-gold" />
            <div>
              <p className="text-sm font-semibold text-foreground">{o.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{o.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
