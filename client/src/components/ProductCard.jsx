import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import useWishlist from '../hooks/useWishlist';
import { formatPrice } from '../lib/pricing';
import PriceTag from './PriceTag';

// Backward-compatible re-export: price formatting now lives in the single pricing helper.
export const fmtPrice = formatPrice;

export default function ProductCard({ product, index = 0 }) {
  const { isWishlisted, toggle } = useWishlist();

  const primary = product.images?.[0]?.url;
  const secondary = product.images?.[1]?.url;

  // CRITICAL FIX: Ensure we use the correct product id
  const productId = product.id;
  const wished = isWishlisted(productId);

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
      className="group relative flex h-full flex-col"
      data-testid={`product-card-${product.slug}`}
    >
      <Link to={`/products/${product.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-surface transition-shadow duration-300 ease-out md:group-hover:shadow-[0_18px_40px_-14px_rgba(17,17,17,0.28)]">
          {/* Badges */}
          <div className="absolute left-3 top-3 z-20 flex flex-col gap-1.5">
            {product.isNewArrival && (
              <span className="rounded-full bg-foreground/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-luxe-sm text-white backdrop-blur-sm">New</span>
            )}
            {product.isBestSeller && (
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-luxe-sm text-gold shadow-sm backdrop-blur-sm">Best Seller</span>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={handleWish}
            data-testid={`wishlist-toggle-${product.slug}`}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-800 shadow-[0_2px_12px_rgba(0,0,0,0.14)] transition-all duration-300 hover:shadow-[0_4px_18px_rgba(0,0,0,0.22)] md:hover:scale-110 dark:bg-neutral-900 dark:text-neutral-100"
          >
            <Heart
              size={16}
              className={wished ? 'fill-red-500 text-red-500' : ''}
            />
          </button>

          {/* Images */}
          <img
            src={primary}
            alt={product.name}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-300 ease-out ${secondary ? 'md:group-hover:opacity-0' : 'md:group-hover:scale-[1.04]'}`}
          />
          {secondary && (
            <img
              src={secondary}
              alt={`${product.name} alternate`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-center opacity-0 transition-all duration-300 ease-out md:group-hover:scale-[1.04] md:group-hover:opacity-100"
            />
          )}
        </div>

        {/* Meta: Category → Name (2-line clamp) → single-line Price Row */}
        <div className="flex flex-1 flex-col px-0.5 pt-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{product.category?.name}</p>
          <h3 className="mt-1.5 line-clamp-2 h-10 text-sm font-medium leading-5 text-foreground">{product.name}</h3>
          <div className="mt-auto pt-2">
            <PriceTag
              product={product}
              size="sm"
              layout="inline"
              className="!flex-nowrap gap-x-1.5 overflow-hidden whitespace-nowrap"
              testId={`product-price-${product.slug}`}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
