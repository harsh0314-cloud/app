import { fmtPrice } from '../ProductCard';

export default function StickyMobileBar({ price, comparePrice, onSale, onAddToBag, onBuyNow, adding, buying, disabled }) {
  return (
    <div
      className="fixed inset-x-0 z-40 border-t border-border bg-background px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden"
      style={{ bottom: 'calc(76px + env(safe-area-inset-bottom))' }}
      data-testid="sticky-mobile-bar"
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold text-foreground">{fmtPrice(price)}</span>
            {onSale && <span className="text-xs text-muted-foreground line-through">{fmtPrice(comparePrice)}</span>}
          </div>
        </div>
        <div className="flex flex-1 gap-2">
          <button
            onClick={onAddToBag}
            disabled={adding || disabled}
            data-testid="sticky-add-to-bag"
            className="flex-1 border border-foreground py-3 text-[10px] font-semibold uppercase tracking-luxe-sm text-foreground transition-colors disabled:opacity-50"
          >
            {adding ? 'Adding…' : 'Add to Bag'}
          </button>
          <button
            onClick={onBuyNow}
            disabled={buying || disabled}
            data-testid="sticky-buy-now"
            className="flex-1 bg-foreground py-3 text-[10px] font-semibold uppercase tracking-luxe-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {buying ? 'Please wait…' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
