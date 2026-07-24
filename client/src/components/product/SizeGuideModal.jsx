import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const GUIDE = [
  { size: 'S', chest: 38, length: 27, shoulder: 17, sleeve: 8 },
  { size: 'M', chest: 40, length: 28, shoulder: 18, sleeve: 8.5 },
  { size: 'L', chest: 42, length: 29, shoulder: 19, sleeve: 9 },
  { size: 'XL', chest: 44, length: 30, shoulder: 20, sleeve: 9.5 },
  { size: 'XXL', chest: 46, length: 31, shoulder: 21, sleeve: 10 },
  { size: 'XXXL', chest: 48, length: 32, shoulder: 22, sleeve: 10.5 },
];

export default function SizeGuideModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={onClose}
          data-testid="size-guide-modal"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-background p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl font-bold tracking-tight">Size Guide</h3>
                <p className="mt-1 text-xs text-muted-foreground">All measurements in inches</p>
              </div>
              <button onClick={onClose} data-testid="size-guide-close" className="p-1 text-muted-foreground transition-colors hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 overflow-hidden border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-luxe-sm">Size</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-luxe-sm">Chest</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-luxe-sm">Length</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-luxe-sm">Shoulder</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-luxe-sm">Sleeve</th>
                  </tr>
                </thead>
                <tbody>
                  {GUIDE.map((r) => (
                    <tr key={r.size} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">{r.size}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.chest}"</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.length}"</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.shoulder}"</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.sleeve}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Measurements may vary by ±0.5 inch. For an oversized fit, we recommend choosing your regular size.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
