import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageGallery({ images = [], name, discount, onSale }) {
  const [selected, setSelected] = useState(0);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  const touchStartX = useRef(null);

  const list = images.length ? images : [{ url: '' }];
  const current = list[selected] || list[0];

  const onZoomMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ active: true, x, y });
  };

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) setSelected((s) => Math.min(list.length - 1, s + 1));
      else setSelected((s) => Math.max(0, s - 1));
    }
    touchStartX.current = null;
  };

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row">
      {/* Thumbnails */}
      {list.length > 1 && (
        <div className="flex gap-3 lg:flex-col" data-testid="gallery-thumbnails">
          {list.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              data-testid={`gallery-thumb-${i}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition-all duration-300 lg:h-20 lg:w-20 ${
                selected === i ? 'border-foreground opacity-100' : 'border-border opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-[1.06]" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div
        onMouseMove={onZoomMove}
        onMouseEnter={() => setZoom((z) => ({ ...z, active: true }))}
        onMouseLeave={() => setZoom({ active: false, x: 50, y: 50 })}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        data-testid="product-zoom-image"
        className="relative aspect-[4/5] flex-1 cursor-zoom-in overflow-hidden rounded-[20px] bg-surface shadow-[0_20px_50px_-20px_rgba(17,17,17,0.28)] select-none"
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={selected}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            src={current?.url}
            alt={name}
            loading="eager"
            className="h-full w-full object-cover transition-transform duration-200 ease-out"
            style={
              zoom.active
                ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` }
                : { transform: 'scale(1)' }
            }
          />
        </AnimatePresence>
        {onSale && (
          <span className="absolute left-4 top-4 z-10 bg-sale-red px-3 py-1 text-[10px] font-semibold uppercase tracking-luxe-sm text-white">
            -{discount}%
          </span>
        )}
      </div>
    </div>
  );
}
