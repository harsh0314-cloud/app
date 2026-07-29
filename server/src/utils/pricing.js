// SINGLE SOURCE OF TRUTH FOR ALL PRICING
const TAX_RATE = 0.18; // 18% GST
const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_COST = 40;

exports.calculateOrderTotals = (subtotal, discount = 0) => {
  const subtotalNum = parseFloat(subtotal);
  const discountNum = parseFloat(discount) || 0;
  const taxableAmount = Math.max(0, subtotalNum - discountNum);
  const tax = parseFloat((taxableAmount * TAX_RATE).toFixed(2));
  const shippingCost = taxableAmount > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = parseFloat((taxableAmount + tax + shippingCost).toFixed(2));

  return {
    subtotal: subtotalNum.toFixed(2),
    discount: discountNum.toFixed(2),
    tax: tax.toFixed(2),
    shippingCost: shippingCost.toFixed(2),
    total: total.toFixed(2)
  };
};

// Validate admin-entered product pricing (single source of truth for the rules).
// StoreX stores comparePrice as the Original Price / MRP and price as the Selling Price.
// The discount % is derived on display only and is never stored.
// Returns an error message string when invalid, or null when the pricing is valid.
exports.validateProductPricing = (price, comparePrice) => {
  const p = parseFloat(price);
  if (!Number.isFinite(p) || p <= 0) return 'Selling Price must be greater than 0';

  const hasMrp = comparePrice !== undefined && comparePrice !== null && comparePrice !== '';
  if (hasMrp) {
    const o = parseFloat(comparePrice);
    if (!Number.isFinite(o) || o <= 0) return 'Original Price (MRP) must be greater than 0';
    if (p > o) return 'Selling Price cannot be greater than Original Price (MRP)';
  }
  return null;
};