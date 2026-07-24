import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

function AccordionItem({ title, children, defaultOpen = false, testid }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid={testid}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-luxe-sm">{title}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown size={18} className="text-muted-foreground" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6 text-sm leading-relaxed text-muted-foreground">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductAccordions({ product }) {
  return (
    <div className="mt-16" data-testid="product-accordions">
      <AccordionItem title="Product Description" defaultOpen testid="accordion-description">
        {product?.description || product?.shortDescription || 'Crafted with premium materials for everyday comfort and a refined, modern silhouette.'}
      </AccordionItem>
      <AccordionItem title="Material & Care" testid="accordion-material">
        <ul className="list-inside list-disc space-y-1">
          <li>100% premium cotton fabric</li>
          <li>Machine wash cold with like colours</li>
          <li>Do not bleach · Tumble dry low</li>
          <li>Warm iron if needed</li>
        </ul>
      </AccordionItem>
      <AccordionItem title="Shipping Information" testid="accordion-shipping">
        <ul className="list-inside list-disc space-y-1">
          <li>Free shipping on orders above ₹500</li>
          <li>Dispatched within 24–48 hours</li>
          <li>Standard delivery in 4–6 business days</li>
        </ul>
      </AccordionItem>
      <AccordionItem title="Return & Exchange Policy" testid="accordion-returns">
        <ul className="list-inside list-disc space-y-1">
          <li>Easy 15-day returns &amp; exchanges</li>
          <li>Item must be unused with original tags</li>
          <li>Instant refund to original payment method</li>
        </ul>
      </AccordionItem>
    </div>
  );
}
