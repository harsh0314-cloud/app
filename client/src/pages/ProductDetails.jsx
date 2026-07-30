import { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ArrowLeft, Star, ShoppingBag, Zap } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';
import { useCartStore } from '../store/cartStore';
import useWishlist from '../hooks/useWishlist';
import { fmtPrice } from '../components/ProductCard';
import { getPricing } from '../lib/pricing';
import PriceTag from '../components/PriceTag';
import ReviewSection from '../components/ReviewSection';
import { pushRecentlyViewed } from '../hooks/useRecentlyViewed';
import RecentlyViewed from '../components/RecentlyViewed';
import useAuthStore from '../store/authStore';
import ImageGallery from '../components/product/ImageGallery';
import SizeSelector from '../components/product/SizeSelector';
import SizeGuideModal from '../components/product/SizeGuideModal';
import DeliveryChecker from '../components/product/DeliveryChecker';
import OffersSection from '../components/product/OffersSection';
import KeyHighlights from '../components/product/KeyHighlights';
import ProductAccordions from '../components/product/ProductAccordions';
import StickyMobileBar from '../components/product/StickyMobileBar';

const ProductCard = lazy(() => import('../components/ProductCard'));

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const addToCart = useCartStore((s) => s.addToCart);
  const { isWishlisted, toggle } = useWishlist();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [fbt, setFbt] = useState([]);
  const [selectedSize, setSelectedSize] = useState(null);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [addingBundle, setAddingBundle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSelectedSize(null);
    api.get(`/products/${slug}`)
      .then((res) => {
        const p = res.data?.product || res.data?.data?.product;
        setProduct(p);
        if (p?.id) {
          pushRecentlyViewed(p);
          if (useAuthStore.getState().user) {
            api.post('/users/recently-viewed', { productId: p.id }).catch(() => {});
          }
        }
      })
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));

    api.get(`/products/${slug}/related`).then((r) => setRelated(r.data?.products || [])).catch(() => {});
    api.get(`/products/${slug}/frequently-bought-together`).then((r) => setFbt(r.data?.products || [])).catch(() => {});
  }, [slug]);

  if (loading) {
    return (
      <div className="container-luxe py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="aspect-[4/5] animate-pulse rounded-[20px] bg-surface" />
          <div className="space-y-4">
            <div className="h-4 w-1/4 animate-pulse bg-surface" />
            <div className="h-8 w-3/4 animate-pulse bg-surface" />
            <div className="h-6 w-1/3 animate-pulse bg-surface" />
            <div className="mt-6 h-4 w-full animate-pulse bg-surface" />
            <div className="h-4 w-full animate-pulse bg-surface" />
            <div className="mt-8 flex gap-3">
              {DEFAULT_SIZES.map((s) => <div key={s} className="h-12 w-12 animate-pulse bg-surface" />)}
            </div>
            <div className="mt-8 h-14 w-full animate-pulse bg-surface" />
            <div className="h-14 w-full animate-pulse bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const wished = isWishlisted(product.id);
  const { onSale, discountPercent: discount } = getPricing(product);
  const productUrl = `https://storex-frontend-gold.vercel.app/products/${slug}`;
  const inStock = (product.inventory?.quantity ?? 1) > 0;
  const reviews = product.reviews || [];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;

  const sizeVariants = (product.variants || []).filter((v) => (v.name || '').toLowerCase().includes('size'));
  const sizes = sizeVariants.length
    ? sizeVariants.map((v) => ({ label: v.value, stock: v.stock ?? 0 }))
    : DEFAULT_SIZES.map((label) => ({ label, stock: inStock ? null : 0 }));
  const anySizeAvailable = sizes.some((s) => s.stock === null || s.stock > 0);

  // Product-specific size guide (null => hide the Size Guide button)
  const sizeGuide =
    product.sizeGuide && Array.isArray(product.sizeGuide.columns) && product.sizeGuide.columns.length && Array.isArray(product.sizeGuide.rows) && product.sizeGuide.rows.length
      ? product.sizeGuide
      : null;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: (product.images || []).map((i) => i.url).filter(Boolean),
      description: product.description || product.shortDescription || product.name,
      sku: product.sku,
      brand: { '@type': 'Brand', name: product.brand?.name || 'StoreX' },
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'INR',
        price: String(product.price),
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
      ...(reviews.length
        ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: avgRating.toFixed(1), reviewCount: reviews.length } }
        : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://storex-frontend-gold.vercel.app/' },
        { '@type': 'ListItem', position: 2, name: 'Products', item: 'https://storex-frontend-gold.vercel.app/products' },
        ...(product.category?.name ? [{ '@type': 'ListItem', position: 3, name: product.category.name, item: `https://storex-frontend-gold.vercel.app/products?category=${product.category.slug || ''}` }] : []),
        { '@type': 'ListItem', position: product.category?.name ? 4 : 3, name: product.name, item: productUrl },
      ],
    },
  ];

  const requireSize = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return false;
    }
    return true;
  };

  const handleAdd = async () => {
    if (!requireSize()) return;
    setAdding(true);
    try {
      await addToCart(product.id, 1, selectedSize);
      window.dispatchEvent(new Event('open-cart'));
      toast.success(`${product.name} (${selectedSize}) added to bag`);
    } catch {
      toast.error('Please sign in to add items');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!requireSize()) return;
    setBuying(true);
    try {
      await addToCart(product.id, 1, selectedSize);
      navigate('/checkout');
    } catch {
      toast.error('Please sign in to continue');
    } finally {
      setBuying(false);
    }
  };

  const handleWish = async () => {
    const added = await toggle(product);
    toast(added ? 'Saved to wishlist' : 'Removed from wishlist', { icon: added ? '♥' : '♡' });
  };

  const handleAddBundle = async () => {
    setAddingBundle(true);
    try {
      await addToCart(product.id, 1);
      for (const p of fbt) { await addToCart(p.id, 1); }
      window.dispatchEvent(new Event('open-cart'));
      toast.success('Bundle added to bag');
    } catch {
      toast.error('Please sign in to add items');
    } finally {
      setAddingBundle(false);
    }
  };

  return (
    <>
      <SEO
        title={`${product.name} — StoreX`}
        description={product.description?.substring(0, 160) || `Shop ${product.name} at StoreX. Premium quality, designed in-house.`}
        keywords={`${product.name}, ${product.category?.name}, luxury clothing, StoreX`}
        image={product.images?.[0]?.url}
        url={productUrl}
        type="product"
        jsonLd={jsonLd}
      />

      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} sizeGuide={sizeGuide} />

      <div className="container-luxe py-14 pb-32 lg:pb-14">
        <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Gallery */}
          <ImageGallery images={product.images || []} name={product.name} discount={discount} onSale={onSale} />

          {/* Info */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="overline text-muted-foreground">{product.brand?.name || product.category?.name}</p>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">{product.name}</h1>
              </div>
              {reviews.length > 0 && (
                <div className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5" data-testid="rating-badge">
                  <Star size={14} className="text-gold" style={{ fill: '#C7A86D' }} />
                  <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">| {reviews.length}</span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="mt-5" data-testid="price-section">
              <PriceTag product={product} size="lg" testId="pdp-price" />
              <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</p>
            </div>

            {/* Size selection */}
            <div className="mt-8 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-luxe-sm">Select Size</span>
              {sizeGuide && (
                <button
                  onClick={() => setSizeGuideOpen(true)}
                  data-testid="size-guide-open"
                  className="text-xs font-semibold text-foreground underline-offset-4 transition-colors hover:text-gold hover:underline"
                >
                  Size Guide ›
                </button>
              )}
            </div>
            <SizeSelector sizes={sizes} selected={selectedSize} onSelect={setSelectedSize} />

            {/* Actions */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={handleAdd}
                disabled={adding || !anySizeAvailable}
                data-testid="add-to-bag-btn"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-foreground py-4 text-[11px] font-semibold uppercase tracking-luxe-sm text-foreground transition-colors hover:bg-foreground hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingBag size={16} /> {adding ? 'Adding…' : anySizeAvailable ? 'Add to Bag' : 'Out of Stock'}
              </button>
              <button
                onClick={handleWish}
                data-testid="wishlist-btn"
                aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-xl border border-border transition-colors hover:bg-surface"
              >
                <motion.span whileTap={{ scale: 0.8 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                  <Heart size={20} className={wished ? 'fill-red-500 text-red-500' : ''} />
                </motion.span>
              </button>
            </div>
            <button
              onClick={handleBuyNow}
              disabled={buying || !anySizeAvailable}
              data-testid="buy-now-btn"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-4 text-[11px] font-semibold uppercase tracking-luxe-sm text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Zap size={16} /> {buying ? 'Please wait…' : 'Buy Now'}
            </button>

            <DeliveryChecker />
            <OffersSection />
          </motion.div>
        </div>

        <KeyHighlights product={product} />
        <ProductAccordions product={product} />

        <ReviewSection productId={product.id} />

        {/* Frequently Bought Together */}
        {fbt.length > 0 && (
          <div className="mt-24" data-testid="fbt-section">
            <h2 className="font-display text-2xl font-bold tracking-tight">Frequently Bought Together</h2>
            <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center">
              <div className="flex flex-1 flex-wrap items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-28 w-28 overflow-hidden rounded-lg bg-surface">
                    <img src={product.images?.[0]?.url} alt={product.name} className="h-full w-full object-cover" />
                  </div>
                  <p className="mt-2 max-w-[7rem] truncate text-center text-xs">{product.name}</p>
                </div>
                {fbt.map((p) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <span className="text-2xl text-muted-foreground">+</span>
                    <div className="flex flex-col items-center">
                      <div className="h-28 w-28 overflow-hidden rounded-lg bg-surface">
                        <img src={p.images?.[0]?.url} alt={p.name} className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-2 max-w-[7rem] truncate text-center text-xs">{p.name}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="lg:w-64">
                <p className="text-sm text-muted-foreground">Bundle price</p>
                <p className="font-display text-2xl font-semibold">
                  {fmtPrice(Number(product.price) + fbt.reduce((s, p) => s + Number(p.price), 0))}
                </p>
                <button
                  onClick={handleAddBundle}
                  disabled={addingBundle}
                  data-testid="fbt-add-all"
                  className="mt-4 w-full bg-foreground py-3.5 text-[11px] font-semibold uppercase tracking-luxe-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {addingBundle ? 'Adding…' : `Add all ${fbt.length + 1} to Bag`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-24">
            <h2 className="font-display text-2xl font-bold tracking-tight">You May Also Like</h2>
            <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
              <Suspense fallback={<div className="aspect-[4/5] animate-pulse rounded-lg bg-surface" />}>
                {related.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </Suspense>
            </div>
          </div>
        )}

        <RecentlyViewed excludeId={product.id} />
      </div>

      <StickyMobileBar
        price={product.price}
        comparePrice={product.comparePrice}
        onSale={onSale}
        onAddToBag={handleAdd}
        onBuyNow={handleBuyNow}
        adding={adding}
        buying={buying}
        disabled={!anySizeAvailable}
      />
    </>
  );
}
