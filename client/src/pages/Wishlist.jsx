import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import useWishlist from '../hooks/useWishlist';
import { useCartStore } from '../store/cartStore';
import { fmtPrice } from '../components/ProductCard';

export default function Wishlist() {
  const { items, remove } = useWishlist();
  const addToCart = useCartStore((s) => s.addToCart);

  const add = async (item) => {
    try {
      await addToCart(item.id, 1);
      window.dispatchEvent(new Event('open-cart'));
      toast.success('Added to bag');
    } catch { toast.error('Please sign in to add items'); }
  };

  if (items.length === 0) {
    return (
      <div className="container-luxe flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <Heart size={44} strokeWidth={1} className="text-muted-foreground" />
        <h1 className="font-display text-4xl font-bold tracking-tight">Your wishlist is empty</h1>
        <p className="max-w-sm text-muted-foreground">Tap the heart on any piece to save it here for later.</p>
        <Link to="/products" data-testid="wishlist-shop-link" className="border border-foreground px-9 py-4 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">Discover</Link>
      </div>
    );
  }

  return (
    <div className="container-luxe py-14">
      <p className="overline text-muted-foreground">{items.length} Saved</p>
      <h1 className="mb-12 mt-3 font-display text-5xl font-bold tracking-tight sm:text-6xl">Wishlist</h1>

      <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
        {items.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i % 4) * 0.06 }} className="group relative" data-testid={`wishlist-item-${item.slug}`}>
            <button onClick={() => remove(item.id)} data-testid={`wishlist-remove-${item.slug}`} className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 backdrop-blur-md transition-colors hover:bg-white"><X size={16} /></button>
            <Link to={`/products/${item.slug}`} className="block">
              <div className="aspect-[4/5] overflow-hidden bg-surface"><img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /></div>
              <div className="flex items-start justify-between pt-4">
                <div><p className="overline text-muted-foreground">{item.category}</p><h3 className="mt-1 font-display text-sm font-semibold">{item.name}</h3></div>
                <span className="font-display text-sm font-semibold">{fmtPrice(item.price)}</span>
              </div>
            </Link>
            <button onClick={() => add(item)} data-testid={`wishlist-add-${item.slug}`} className="mt-3 flex w-full items-center justify-center gap-2 border border-foreground py-3 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white"><Plus size={14} /> Add to Bag</button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
