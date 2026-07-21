import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Plus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import useWishlist from '../hooks/useWishlist';

export const fmtPrice = (v) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : v;
};

export default function ProductCard({ product, index = 0 }) {
  const addToCart = useCartStore((s) => s.addToCart);
  const { isWishlisted, toggle } = useWishlist();
  const [adding, setAdding] = useState(false);

  const primary = product.images?.[0]?.url;
  const secondary = product.images?.[1]?.url;
  const onSale = product.comparePrice && Number(product.comparePrice) > Number(product.price);
  const discount = onSale ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100) : 0;

  // CRITICAL FIX: Ensure we use the correct product id
  const productId = product.id;
  const wished = isWishlisted(productId);

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    try {
      await addToCart(productId, 1);
      window.dispatchEvent(new Event('open-cart'));
      toast.success(`${product.name} added to bag`);
    } catch {
      toast.error('Please sign in to add items');
    } finally {
      setAdding(false);
    }
  };

  const handleWish = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!productId) {
      console.error('ProductCard: Missing product.id', product);
      toast.error('Cannot add to wishlist: missing product ID');
      return;
    }

    const added = await toggle(product);

    if (added) {
      toast.success('Saved to wishlist', { icon: '♥' });
    } else {
      toast.success('Removed from wishlist', { icon: '♡' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
      data-testid={`product-card-${product.slug}`}
    >
      <Link to={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface">
          {/* Badges */}
          <div className="absolute left-4 top-4 z-20 flex flex-col gap-2">
            {product.isNewArrival && (
              <span className="bg-foreground px-3 py-1 text-[10px] font-semibold uppercase tracking-luxe-sm text-white">New</span>
            )}
            {onSale && (
              <span className="bg-sale-red px-3 py-1 text-[10px] font-semibold uppercase tracking-luxe-sm text-white">-{discount}%</span>
            )}
            {product.isBestSeller && (
              <span className="border border-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-luxe-sm text-gold">Icon</span>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={handleWish}
            data-testid={`wishlist-toggle-${product.slug}`}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/70 backdrop-blur-md transition-all duration-300 hover:bg-white"
          >
            <Heart 
              size={17} 
              className={wished ? 'fill-red-500 text-red-500' : 'text-foreground'} 
            />
          </button>

          {/* Images */}
          <img
            src={primary}
            alt={product.name}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${secondary ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
          />
          {secondary && (
            <img
              src={secondary}
              alt={`${product.name} alternate`}
              className="absolute inset-0 h-full w-full scale-105 object-cover object-center opacity-0 transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 group-hover:scale-100"
            />
          )}

          {/* Quick add */}
          <div className="absolute inset-x-4 bottom-4 z-20 translate-y-6 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100">
            <button
              onClick={handleAdd}
              disabled={adding}
              data-testid={`quick-add-${product.slug}`}
              className="flex w-full items-center justify-center gap-2 bg-foreground py-3.5 text-[11px] font-semibold uppercase tracking-luxe-sm text-white transition-colors hover:bg-gold disabled:opacity-60"
            >
              {adding ? 'Adding…' : (<><Plus size={15} /> Add to Bag</>)}
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-start justify-between gap-3 pt-4">
          <div className="min-w-0">
            <p className="overline text-muted-foreground">{product.category?.name}</p>
            <h3 className="mt-1 truncate font-display text-[15px] font-semibold tracking-tight text-foreground">{product.name}</h3>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="font-display text-[15px] font-semibold text-foreground">{fmtPrice(product.price)}</span>
            {onSale && <span className="text-xs text-muted-foreground line-through">{fmtPrice(product.comparePrice)}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}