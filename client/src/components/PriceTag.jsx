import { getPricing, formatPrice } from '../lib/pricing';

// ────────────────────────────────────────────────────────────────
// The ONE reusable pricing display used across the entire StoreX app
// (Home, Shop, Categories, Search, Product Card, Product Details,
// Wishlist, Cart, Cart Drawer, Checkout, Recently Viewed, Related,
// New Arrivals, Best Sellers, Admin).
//
// Renders:
//   ₹699   ₹1799 (strikethrough)   61% OFF      → when on sale
//   ₹699                                        → when MRP == price / no MRP
//
// The discount is derived from ../lib/pricing (never stored, never
// recomputed elsewhere). Fully responsive, dark-mode & screen-reader aware.
// ────────────────────────────────────────────────────────────────

const SIZES = {
  sm: { price: 'text-[15px]', compare: 'text-xs', off: 'text-xs' },
  md: { price: 'text-lg', compare: 'text-sm', off: 'text-sm' },
  lg: { price: 'text-3xl', compare: 'text-lg', off: 'text-lg' },
};

export default function PriceTag({
  product,
  price,
  comparePrice,
  size = 'md',
  layout = 'inline',   // 'inline' | 'stacked'
  align = 'left',      // 'left' | 'right'
  showOff = true,      // show the "61% OFF" label
  className = '',
  testId = 'price-tag',
}) {
  const data = product ? getPricing(product) : getPricing({ price, comparePrice });
  const s = SIZES[size] || SIZES.md;

  const alignCls = align === 'right' ? 'items-end text-right' : 'items-start';
  const container =
    layout === 'stacked'
      ? `flex flex-col gap-0.5 ${alignCls}`
      : 'flex flex-wrap items-baseline gap-x-2 gap-y-1';

  return (
    <div className={`${container} ${className}`} data-testid={testId}>
      <span
        className={`font-display font-bold text-foreground ${s.price}`}
        data-testid="price-selling"
      >
        {formatPrice(data.price)}
      </span>

      {data.onSale && (
        <span
          className={`text-muted-foreground line-through ${s.compare}`}
          data-testid="price-original"
          aria-label={`Original price ${formatPrice(data.originalPrice)}`}
        >
          {formatPrice(data.originalPrice)}
        </span>
      )}

      {data.onSale && showOff && (
        <span
          className={`font-bold text-green-600 dark:text-green-500 ${s.off}`}
          data-testid="price-discount"
        >
          {data.discountPercent}% OFF
        </span>
      )}
    </div>
  );
}
