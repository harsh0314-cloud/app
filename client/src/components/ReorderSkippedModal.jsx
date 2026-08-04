import { X, AlertCircle, ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const REASON_META = {
  DELETED:      { label: 'No longer available',  color: 'text-gray-500',  icon: Package },
  UNAVAILABLE:  { label: 'Discontinued',          color: 'text-gray-500',  icon: Package },
  OUT_OF_STOCK: { label: 'Out of stock',          color: 'text-red-600',   icon: AlertCircle },
};

export default function ReorderSkippedModal({ open, onClose, onGoToCart, info }) {
  if (!info) return null;
  const added = info.added || [];
  const skipped = info.skipped || [];
  const priceChanged = added.filter((a) => a.priceChanged);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/60 grid place-items-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          data-testid="reorder-modal"
        >
          <motion.div
            className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-600" />
                <h3 className="font-semibold text-sm">Reorder from {info.orderNumber}</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {added.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Added to cart ({added.length})</p>
                  <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                    {added.map((a, i) => (
                      <li key={i} className="flex items-center gap-3 p-3">
                        {a.image ? <img src={a.image} alt="" className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 rounded bg-gray-100" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {a.quantity}</p>
                        </div>
                        {a.priceChanged && (
                          <span title={`Was ₹${a.oldPrice}, now ₹${a.newPrice}`} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <TrendingUp size={10}/> price updated
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {priceChanged.length > 0 && (
                    <p className="mt-2 text-[11px] text-amber-700">Prices for some items have changed since your last order.</p>
                  )}
                </div>
              )}

              {skipped.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-red-600 font-semibold">Skipped ({skipped.length})</p>
                  <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                    {skipped.map((s, i) => {
                      const meta = REASON_META[s.reason] || REASON_META.UNAVAILABLE;
                      const Icon = meta.icon;
                      return (
                        <li key={i} className="flex items-center gap-3 p-3">
                          {s.image ? <img src={s.image} alt="" className="w-10 h-10 rounded object-cover grayscale" /> : <div className="w-10 h-10 rounded bg-gray-100" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            <p className={`text-xs flex items-center gap-1 ${meta.color}`}>
                              <Icon size={12} /> {meta.label}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={onClose} className="text-xs font-semibold uppercase tracking-wide px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">Close</button>
              {added.length > 0 && (
                <button onClick={onGoToCart} className="text-xs font-semibold uppercase tracking-wide px-4 py-2 rounded-md bg-foreground text-white hover:bg-gold" data-testid="go-to-cart-btn">Go to cart</button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
