import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { getRecentlyViewed } from '../hooks/useRecentlyViewed';

// End-to-end recently-viewed rail: uses the server list for logged-in users,
// falls back to the localStorage hook for guests.
export default function RecentlyViewed({ excludeId, title = 'Recently Viewed' }) {
  const { user } = useAuthStore();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (user) {
        try {
          const res = await api.get('/users/recently-viewed');
          if (active) {
            const products = (res.data?.products || []).map((p) => ({
              id: p.id, name: p.name, slug: p.slug, price: p.price,
              comparePrice: p.comparePrice, image: p.images?.[0]?.url, category: p.category?.name,
            }));
            setItems(products);
            return;
          }
        } catch (e) { /* fall through to local */ }
      }
      if (active) setItems(getRecentlyViewed());
    };
    run();
    return () => { active = false; };
  }, [user]);

  const filtered = items.filter((p) => p.id !== excludeId).slice(0, 6);
  if (filtered.length === 0) return null;

  return (
    <section data-testid="recently-viewed" className="mt-16">
      <div className="flex items-center gap-2 mb-6">
        <Clock size={18} className="text-muted-foreground" />
        <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8">
        {filtered.map((p) => (
          <Link key={p.id} to={`/products/${p.slug}`} data-testid={`recent-${p.id}`} className="group block">
            <div className="aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img
                src={p.image || 'https://via.placeholder.com/300x400?text=StoreX'}
                alt={p.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground truncate">{p.name}</p>
            <p className="text-sm text-muted-foreground">₹{parseFloat(p.price || 0).toFixed(2)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
