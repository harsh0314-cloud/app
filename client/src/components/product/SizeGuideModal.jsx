import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function SizeGuideModal({ open, onClose, sizeGuide }) {
  const columns = Array.isArray(sizeGuide?.columns) ? sizeGuide.columns : [];
  const rows = Array.isArray(sizeGuide?.rows) ? sizeGuide.rows : [];
  const hasData = columns.length > 0 && rows.length > 0;

  return (
    <AnimatePresence>
      {open && hasData && (
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
            className="w-full max-w-2xl bg-background p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl font-bold tracking-tight">Size Guide</h3>
                <p className="mt-1 text-xs text-muted-foreground">Measurements are approximate</p>
              </div>
              <button onClick={onClose} data-testid="size-guide-close" className="p-1 text-muted-foreground transition-colors hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 overflow-x-auto border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface text-left">
                    {columns.map((c, i) => (
                      <th key={i} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-luxe-sm whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, ri) => (
                    <tr key={ri} className="border-t border-border">
                      {columns.map((_, ci) => (
                        <td key={ci} className={`px-4 py-3 whitespace-nowrap ${ci === 0 ? 'font-semibold' : 'text-muted-foreground'}`}>
                          {r[ci] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
