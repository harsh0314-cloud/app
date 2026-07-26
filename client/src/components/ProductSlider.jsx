import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';

/**
 * Horizontal, scroll-snapping product slider with prev/next controls.
 * Fully responsive (mobile → 1.4 cols, sm → 2, md → 3, lg → 4).
 * Renders a professional empty state when no products are available.
 *
 * Props:
 *  - title           : Section headline (e.g. "New Arrivals")
 *  - overline        : Small eyebrow label above the title
 *  - viewAllHref     : "View All" link target
 *  - products        : Array of product objects (may be empty)
 *  - emptyMessage    : Copy shown when products.length === 0
 *  - testId          : data-testid for the section wrapper
 */
export default function ProductSlider({
  title,
  overline,
  viewAllHref,
  products = [],
  emptyMessage = 'No products to display yet.',
  testId = 'product-slider',
}) {
  const scrollerRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [products.length]);

  const scrollBy = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Advance by roughly one card-column.
    const card = el.querySelector('[data-slide-item]');
    const step = card ? card.getBoundingClientRect().width + 16 /* gap */ : el.clientWidth * 0.9;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const hasProducts = Array.isArray(products) && products.length > 0;

  return (
    <section
      data-testid={testId}
      className="border-t border-border bg-background"
    >
      <div className="container-luxe py-16 md:py-24">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-6 md:mb-12">
          <div>
            {overline && (
              <p className="overline mb-2 text-muted-foreground" data-testid={`${testId}-overline`}>
                {overline}
              </p>
            )}
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-5xl"
              data-testid={`${testId}-title`}
            >
              {title}
            </motion.h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev / Next – hidden when empty */}
            {hasProducts && (
              <div className="hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => scrollBy(-1)}
                  disabled={!canPrev}
                  aria-label="Previous"
                  data-testid={`${testId}-prev`}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollBy(1)}
                  disabled={!canNext}
                  aria-label="Next"
                  data-testid={`${testId}-next`}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
            {viewAllHref && (
              <Link
                to={viewAllHref}
                data-testid={`${testId}-view-all`}
                className="group inline-flex items-center gap-2 whitespace-nowrap border-b border-foreground pb-1 text-[11px] font-semibold uppercase tracking-luxe-sm text-foreground transition-opacity hover:opacity-70"
              >
                View All
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        </div>

        {/* Body */}
        {hasProducts ? (
          <div
            ref={scrollerRef}
            data-testid={`${testId}-scroller`}
            className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 md:gap-6 md:px-6 md:-mx-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {products.map((product, i) => (
              <div
                key={product.id || product.slug || i}
                data-slide-item
                className="w-[75%] shrink-0 snap-start sm:w-[46%] md:w-[32%] lg:w-[23.5%]"
              >
                <ProductCard product={product} index={i} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message={emptyMessage} viewAllHref={viewAllHref} testId={testId} />
        )}
      </div>
    </section>
  );
}

function EmptyState({ message, viewAllHref, testId }) {
  return (
    <div
      data-testid={`${testId}-empty`}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5">
        <Sparkles size={22} className="text-muted-foreground" />
      </div>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{message}</p>
      {viewAllHref && (
        <Link
          to="/products"
          className="mt-6 inline-flex items-center gap-2 border-b border-foreground pb-1 text-[11px] font-semibold uppercase tracking-luxe-sm text-foreground transition-opacity hover:opacity-70"
        >
          Explore the store
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
