import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Truck, Package, BadgeCheck } from 'lucide-react';

export default function DeliveryChecker() {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const check = () => {
    if (!/^\d{6}$/.test(pincode)) {
      setError('Please enter a valid 6-digit pincode');
      setResult(null);
      return;
    }
    setError('');
    const d = new Date();
    d.setDate(d.getDate() + 4);
    const date = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    setResult({ date, cod: parseInt(pincode[0]) % 2 === 0 });
  };

  return (
    <div className="mt-8 border border-border p-5" data-testid="delivery-checker">
      <div className="flex items-center gap-2">
        <MapPin size={16} className="text-foreground" />
        <h3 className="text-[11px] font-semibold uppercase tracking-luxe-sm">Delivery Options</h3>
      </div>
      <div className="mt-4 flex gap-3">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
          placeholder="Enter pincode"
          data-testid="delivery-pincode-input"
          className="w-full border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
        />
        <button
          onClick={check}
          data-testid="delivery-check-btn"
          className="shrink-0 bg-foreground px-6 py-3 text-[11px] font-semibold uppercase tracking-luxe-sm text-white transition-opacity hover:opacity-90"
        >
          Check
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-sale-red" data-testid="delivery-error">{error}</p>}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            data-testid="delivery-result"
          >
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-3 text-sm">
                <Truck size={16} className="text-gold" />
                <span>Delivery by <span className="font-semibold text-foreground">{result.date}</span></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <BadgeCheck size={16} className="text-gold" />
                <span className="text-muted-foreground">Free shipping on this order</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Package size={16} className="text-gold" />
                <span className="text-muted-foreground">
                  {result.cod ? 'Cash on Delivery available' : 'Cash on Delivery not available'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
