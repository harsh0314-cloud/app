import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, LayoutGrid, Search, Heart, ShoppingBag, User } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import useWishlist from '../../hooks/useWishlist';

const navItems = [
  { label: 'Home', icon: Home, to: '/' },
  { label: 'Categories', icon: LayoutGrid, to: '/products', isAction: 'category' },
  { label: 'Search', icon: Search, to: '/search', isAction: 'search' },
  { label: 'Saved', icon: Heart, to: '/wishlist' },
  { label: 'Bag', icon: ShoppingBag, to: '/cart' },
  { label: 'Account', icon: User, to: '/profile' },
];

export default function MobileNav({ onOpenSearch, onOpenCategories }) {
  const location = useLocation();
   const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('/');
  
  const { isAuthenticated } = useAuthStore();
  const cartItems = useCartStore((s) => s.items);
  const { count: wishCount } = useWishlist();

  // Update active tab smoothly when route changes
  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);

  const handleTap = (item) => {
    if (item.isAction === 'search') {
      onOpenSearch(); // We will wire this up in App.jsx next
    } else if (item.isAction === 'category') {
      navigate('/products');
    }
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
      {/* Glassmorphism Container */}
      <div className="mx-3 mb-3 flex items-center justify-around rounded-2xl border border-white/20 bg-white/80 px-2 py-2 shadow-lg backdrop-blur-xl dark:border-gray-800/30 dark:bg-gray-900/80"
           style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        
        {navItems.map((item) => {
          const isActive = item.to === activeTab || 
                          (item.to !== '/' && activeTab.startsWith(item.to));
          
          // Dynamic Profile Link
          const profileLink = isAuthenticated ? item.to : '/login';

          const content = (
            <div className="flex flex-col items-center gap-0.5 relative">
              {/* Badge for Cart */}
              {item.label === 'Bag' && cartItems.length > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-white"
                >
                  {cartItems.length}
                </motion.span>
              )}

              {/* Badge for Wishlist */}
              {item.label === 'Saved' && wishCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-white"
                >
                  {wishCount}
                </motion.span>
              )}

              <item.icon 
                size={21} 
                strokeWidth={isActive ? 2.5 : 1.5} 
                className={`transition-all duration-200 ${isActive ? 'text-foreground dark:text-white' : 'text-muted-foreground dark:text-gray-500'}`} 
              />
              <span className={`text-[10px] font-medium transition-all duration-200 ${isActive ? 'text-foreground dark:text-white' : 'text-muted-foreground dark:text-gray-500'}`}>
                {item.label}
              </span>

              {/* Active Indicator Dot */}
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -bottom-2 h-1 w-1 rounded-full bg-foreground dark:bg-white"
                />
              )}
            </div>
          );

          // If it's an action button (Search/Categories), render a button
          if (item.isAction) {
            return (
              <button 
                key={item.label} 
                onClick={() => handleTap(item)} 
                className="flex-1 flex flex-col items-center py-1 active:scale-90 transition-transform"
                aria-label={item.label}
              >
                {content}
              </button>
            );
          }

          // Otherwise, render a Link
          return (
            <Link 
              key={item.label} 
              to={item.label === 'Account' ? profileLink : item.to} 
              className="flex-1 flex flex-col items-center py-1 active:scale-90 transition-transform"
              aria-label={item.label}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}