import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useEffect } from 'react';
import { useCartStore } from '../store/cartStore';
import { fmtPrice } from './ProductCard';

const ease = [0.76, 0, 0.24, 1];

export default function CartDrawer({ open, onClose }) {
  const { items, total, fetchCart, updateQuantity, removeItem } = useCartStore();
  useEffect(() => { if (open) fetchCart(); }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            onClick={onClose} className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" data-testid="cart-overlay" />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.6, ease }}
            className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-[440px] flex-col bg-background" data-testid="cart-drawer">
            <div className="flex items-center justify-between border-b border-border px-7 py-6">
              <h2 className="font-display text-lg font-bold uppercase tracking-luxe-sm">Your Bag ({items.length})</h2>
              <button onClick={onClose} data-testid="cart-close" className="transition-transform hover:rotate-90"><X size={22} /></button>
            </div>
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-7 text-center">
                <ShoppingBag size={40} strokeWidth={1} className="text-muted-foreground" />
                <p className="text-muted-foreground">Your bag is empty.</p>
                <Link to="/products" onClick={onClose} className="border border-foreground px-8 py-3 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">Discover</Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-7 py-6 no-scrollbar">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4 border-b border-border py-5 first:pt-0">
                      <img src={item.product.images?.[0]?.url} alt={item.product.name} className="h-28 w-24 shrink-0 object-cover bg-surface" />
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex justify-between gap-2">
                          <div>
                            <p className="overline text-muted-foreground">{item.product.category?.name}</p>
                            <h3 className="font-display text-sm font-semibold">{item.product.name}</h3>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-foreground"><Trash2 size={16} /></button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center border border-border">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="px-2.5 py-1.5 disabled:opacity-30"><Minus size={13} /></button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2.5 py-1.5"><Plus size={13} /></button>
                          </div>
                          <span className="font-display text-sm font-semibold">{fmtPrice(item.product.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border px-7 py-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-display font-semibold">{fmtPrice(total)}</span>
                  </div>
                  <p className="mb-5 text-xs text-muted-foreground">Shipping & taxes calculated at checkout.</p>
                  <Link to="/checkout" onClick={onClose} className="flex w-full items-center justify-center bg-foreground py-4 text-[11px] font-semibold uppercase tracking-luxe-sm text-white transition-colors hover:bg-gold">Proceed to Checkout</Link>
                  <Link to="/cart" onClick={onClose} className="link-underline mx-auto mt-4 block w-fit text-[11px] font-semibold uppercase tracking-luxe-sm text-muted-foreground">View Full Bag</Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}