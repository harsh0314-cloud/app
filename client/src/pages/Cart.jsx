import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Minus, Plus, ArrowRight, ShoppingBag, Bookmark, Truck } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { fmtPrice } from '../components/ProductCard';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Cart() {
  const { items, savedItems, total, fetchCart, removeItem, updateQuantity, clearCart, toggleSave } = useCartStore();
  const navigate = useNavigate();

  const [pincode, setPincode] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState(null);

  useEffect(() => { fetchCart(); }, []);

  const handleEstimate = async () => {
    if (!/^\d{6}$/.test(pincode)) { toast.error('Enter a valid 6-digit pincode'); return; }
    setEstimating(true);
    try {
      const res = await api.post('/shipping/estimate', { postalCode: pincode, subtotal: total });
      setEstimate(res.data);
    } catch (e) {
      toast.error(e.message || 'Could not estimate shipping');
    } finally { setEstimating(false); }
  };

  const shippingCost = estimate ? estimate.cost : (total > 500 ? 0 : 99);

  if (items.length === 0 && savedItems.length === 0) {
    return (
      <div className="container-luxe flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <ShoppingBag size={44} strokeWidth={1} className="text-muted-foreground" />
        <h1 className="font-display text-4xl font-bold tracking-tight">Your bag is empty</h1>
        <p className="max-w-sm text-muted-foreground">You haven’t added anything yet. Explore the collection and find your next essential.</p>
        <Link to="/products" data-testid="cart-shop-link" className="border border-foreground px-9 py-4 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container-luxe py-14">
      <h1 className="mb-12 font-display text-5xl font-bold tracking-tight sm:text-6xl">Shopping Bag</h1>
      <div className="grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {items.length === 0 && (
            <p className="border-y border-border py-8 text-sm text-muted-foreground">Your active bag is empty. Move a saved item back to your bag to check out.</p>
          )}
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} data-testid={`cart-item-${item.id}`} className="flex gap-6 border-b border-border py-6 first:border-t">
              <Link to={`/products/${item.product.slug}`} className="h-36 w-28 shrink-0 overflow-hidden bg-surface">
                <img src={item.product.images?.[0]?.url} alt={item.product.name} className="h-full w-full object-cover" />
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="overline text-muted-foreground">{item.product.category?.name}</p>
                    <Link to={`/products/${item.product.slug}`} className="font-display text-lg font-semibold tracking-tight">{item.product.name}</Link>
                  </div>
                  <span className="font-display text-lg font-semibold">{fmtPrice(item.product.price * item.quantity)}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center border border-border">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} data-testid={`cart-dec-${item.id}`} className="px-3 py-2 disabled:opacity-30"><Minus size={13} /></button>
                    <span className="w-9 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} data-testid={`cart-inc-${item.id}`} className="px-3 py-2"><Plus size={13} /></button>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleSave(item.id)} data-testid={`save-later-${item.id}`} className="flex items-center gap-1 text-xs uppercase tracking-luxe-sm text-muted-foreground hover:text-foreground"><Bookmark size={14} /> Save for later</button>
                    <button onClick={() => removeItem(item.id)} data-testid={`cart-remove-${item.id}`} className="flex items-center gap-1 text-xs uppercase tracking-luxe-sm text-muted-foreground hover:text-foreground"><Trash2 size={14} /> Remove</button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {items.length > 0 && <button onClick={clearCart} data-testid="clear-cart" className="mt-6 text-xs uppercase tracking-luxe-sm text-muted-foreground hover:text-sale-red">Clear Bag</button>}

          {/* Saved for later */}
          {savedItems.length > 0 && (
            <div className="mt-14" data-testid="saved-for-later">
              <h2 className="font-display text-2xl font-bold tracking-tight">Saved for Later <span className="text-muted-foreground">({savedItems.length})</span></h2>
              {savedItems.map((item) => (
                <div key={item.id} data-testid={`saved-item-${item.id}`} className="flex gap-6 border-b border-border py-6 first:mt-6 first:border-t">
                  <Link to={`/products/${item.product.slug}`} className="h-28 w-24 shrink-0 overflow-hidden bg-surface">
                    <img src={item.product.images?.[0]?.url} alt={item.product.name} className="h-full w-full object-cover" />
                  </Link>
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="overline text-muted-foreground">{item.product.category?.name}</p>
                        <Link to={`/products/${item.product.slug}`} className="font-display text-lg font-semibold tracking-tight">{item.product.name}</Link>
                      </div>
                      <span className="font-display text-lg font-semibold">{fmtPrice(item.product.price)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleSave(item.id)} data-testid={`move-to-bag-${item.id}`} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-luxe-sm text-foreground hover:text-gold"><ArrowRight size={14} /> Move to bag</button>
                      <button onClick={() => removeItem(item.id)} data-testid={`saved-remove-${item.id}`} className="flex items-center gap-1 text-xs uppercase tracking-luxe-sm text-muted-foreground hover:text-sale-red"><Trash2 size={14} /> Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="h-fit bg-surface p-8 lg:sticky lg:top-28">
          <h2 className="font-display text-lg font-bold uppercase tracking-luxe-sm">Order Summary</h2>

          {/* Shipping Estimator */}
          <div className="mt-6 border-b border-border pb-6">
            <label className="overline flex items-center gap-2 text-muted-foreground"><Truck size={14} /> Estimate Shipping</label>
            <div className="mt-3 flex gap-2">
              <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} data-testid="shipping-pincode" placeholder="6-digit pincode" className="flex-1 border border-border bg-transparent px-3 py-2 text-sm focus:border-foreground focus:ring-0" />
              <button onClick={handleEstimate} disabled={estimating} data-testid="shipping-estimate-btn" className="border border-foreground px-4 py-2 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white disabled:opacity-50">{estimating ? '…' : 'Check'}</button>
            </div>
            {estimate && (
              <div data-testid="shipping-result" className="mt-3 text-sm">
                <p className="font-medium">{estimate.free ? 'Free shipping' : `Shipping: ${fmtPrice(estimate.cost)}`} · {estimate.zone}</p>
                <p className="text-muted-foreground">Delivery in {estimate.etaLabel}</p>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{fmtPrice(total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="font-semibold">{shippingCost === 0 ? 'Free' : fmtPrice(shippingCost)}</span></div>
            <div className="mt-4 flex justify-between border-t border-border pt-4 font-display text-lg font-bold"><span>Total</span><span>{fmtPrice(total + shippingCost)}</span></div>
          </div>
          <button onClick={() => navigate('/checkout')} disabled={items.length === 0} data-testid="checkout-btn" className="mt-8 flex w-full items-center justify-center gap-2 bg-foreground py-4 text-[12px] font-semibold uppercase tracking-luxe-sm text-white transition-colors hover:bg-gold disabled:opacity-40">
            Checkout <ArrowRight size={15} />
          </button>
          <Link to="/products" className="link-underline mx-auto mt-5 block w-fit text-[11px] font-semibold uppercase tracking-luxe-sm text-muted-foreground">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}
