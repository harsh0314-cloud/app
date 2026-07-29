// ────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for StoreX product pricing on the client.
//
// StoreX already stores two price fields on every Product:
//   • price        → Selling Price (the amount the customer pays)
//   • comparePrice → Original Price / MRP (optional, used for strike-through)
//
// The discount percentage is NEVER stored in the database. It is derived
// here, in ONE place, and consumed by the reusable <PriceTag /> component.
// Do not duplicate this maths anywhere else.
// ────────────────────────────────────────────────────────────────

// Format any numeric-ish value as Indian Rupees, e.g. 1799 -> "₹1,799".
export const formatPrice = (v) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : v;
};

// The one and only discount formula for the whole app.
//   Math.round(((originalPrice - price) / originalPrice) * 100)
export const getDiscountPercent = (price, originalPrice) => {
  const p = Number(price);
  const o = Number(originalPrice);
  if (!Number.isFinite(p) || !Number.isFinite(o) || o <= 0 || o <= p) return 0;
  return Math.round(((o - p) / o) * 100);
};

// Normalise a product-like object into everything the UI needs to render price.
// Accepts either a full product ({ price, comparePrice }) or explicit values.
export const getPricing = (product = {}) => {
  const price = Number(product.price);
  const rawOriginal = product.comparePrice != null ? Number(product.comparePrice) : null;
  const originalPrice = Number.isFinite(rawOriginal) ? rawOriginal : null;
  const onSale = originalPrice != null && originalPrice > price;
  const discountPercent = onSale ? getDiscountPercent(price, originalPrice) : 0;
  return { price, originalPrice, onSale, discountPercent };
};
