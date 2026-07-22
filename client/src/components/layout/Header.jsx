import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ShoppingBag, Search, Heart, User } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import useWishlist from '../../hooks/useWishlist';
import CartDrawer from '../CartDrawer';
import api from '../../services/api';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/products' },
  { label: 'New', to: '/products?sort=newest' },
  { label: 'Sale', to: '/products?sort=price-desc' },
];

const ease = [0.76, 0, 0.24, 1];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchTrigger, setMobileSearchTrigger] = useState(false); 
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);

  const { user, isAuthenticated, logout } = useAuthStore();
  const cartItems = useCartStore((s) => s.items);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const { count: wishCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const transparent = isHome && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { if (isAuthenticated) fetchCart(); }, [isAuthenticated]);

  useEffect(() => {
    const open = () => setCartOpen(true);
    window.addEventListener('open-cart', open);
    return () => window.removeEventListener('open-cart', open);
  }, []);

  // ADDED: Listen for Mobile Nav Search Tap
  useEffect(() => {
    const openSearch = () => setMobileSearchTrigger(true);
    window.addEventListener('open-search', openSearch);
    return () => window.removeEventListener('open-search', openSearch);
  }, []);

  useEffect(() => { 
    setMenuOpen(false); 
    setSearchOpen(false); 
    setMobileSearchTrigger(false); // Reset trigger on route change
  }, [location.pathname, location.search]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) { 
      navigate(`/products?search=${encodeURIComponent(query.trim())}`); 
      setQuery(''); 
      setSuggestions([]);
      setSearchOpen(false); 
      setMobileSearchTrigger(false); // Reset trigger on search
    }
  };

  // Instant search suggestions (debounced)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    setSugLoading(true);
    const t = setTimeout(() => {
      api.get(`/products/suggestions?q=${encodeURIComponent(q)}`)
        .then((res) => setSuggestions(res.data?.suggestions || []))
        .catch(() => setSuggestions([]))
        .finally(() => setSugLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const goToProduct = (slug) => {
    navigate(`/products/${slug}`);
    setQuery('');
    setSuggestions([]);
    closeSearch();
  };

  const dark = transparent;
  const iconBtn = `relative flex h-10 w-10 items-center justify-center transition-opacity hover:opacity-60`;
  
  // Combined state for Search Overlay
  const isSearchVisible = searchOpen || mobileSearchTrigger;
  const closeSearch = () => { setSearchOpen(false); setMobileSearchTrigger(false); };

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease }}
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${transparent ? 'bg-transparent' : 'border-b border-border bg-white/80 backdrop-blur-xl'}`}
        data-testid="site-header"
      >
        <div className="container-luxe">
            <div className={`flex items-center justify-between lg:grid lg:grid-cols-3 transition-all duration-500 ${scrolled ? 'h-16' : 'h-20'} ${dark ? 'text-white' : 'text-foreground'}`}> 
            <nav className="hidden flex-1 items-center gap-8 lg:flex">
              {NAV.map((n) => (
                <Link key={n.label} to={n.to} data-testid={`nav-${n.label.toLowerCase()}`} className="link-underline text-[12px] font-semibold uppercase tracking-luxe-sm">{n.label}</Link>
              ))}
            </nav>

            {/* Mobile menu btn */}
            <button onClick={() => setMenuOpen(true)} data-testid="mobile-menu-open" className="lg:hidden"><Menu size={22} /></button>

            {/* Logo */}
            <Link to="/" data-testid="logo" className="flex-1 text-center lg:flex-none lg:col-start-2 lg:justify-self-center font-display text-lg font-extrabold uppercase tracking-[0.2em] md:text-2xl md:tracking-[0.3em]">      
              StoreX
            </Link>

            {/* Right icons */}
            <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-2">
              <button onClick={() => setSearchOpen(true)} data-testid="search-open" className={iconBtn} aria-label="Search"><Search size={19} /></button>
              <Link to="/wishlist" data-testid="wishlist-link" className={iconBtn} aria-label="Wishlist">
                <Heart size={19} />
                {wishCount > 0 && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-white">{wishCount}</span>}
              </Link>
              <button onClick={() => setCartOpen(true)} data-testid="cart-open" className={iconBtn} aria-label="Cart">
                <ShoppingBag size={19} />
                {cartItems.length > 0 && <span className="absolute right-0.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-white ring-1 ring-white">{cartItems.length}</span>}
              </button>
              {isAuthenticated ? (
                <div className="hidden items-center gap-2 md:flex">
                  <Link to={user?.role === 'ADMIN' ? '/admin' : '/profile'} data-testid="account-link" className={iconBtn} aria-label="Account"><User size={19} /></Link>
                  <button onClick={() => { logout(); navigate('/'); }} data-testid="logout-btn" className="link-underline text-[11px] font-semibold uppercase tracking-luxe-sm">Logout</button>
                </div>
              ) : (
                <Link to="/login" data-testid="signin-link" className="link-underline ml-1 hidden text-[11px] font-semibold uppercase tracking-luxe-sm md:block">Sign In</Link>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Search overlay - UPDATED TO USE isSearchVisible AND closeSearch */}
      <AnimatePresence>
        {isSearchVisible && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="fixed inset-0 z-[80] bg-white" data-testid="search-overlay">
            <div className="container-luxe pt-8">
              <div className="flex justify-end"><button onClick={closeSearch} data-testid="search-close" className="transition-transform hover:rotate-90"><X size={24} /></button></div>
              <motion.form onSubmit={submitSearch} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.6, ease }} className="mx-auto mt-[12vh] max-w-3xl">
                <p className="overline mb-6 text-muted-foreground">Search the collection</p>
                <div className="flex items-center gap-4 border-b-2 border-foreground pb-4">
                  <Search size={28} />
                  <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} data-testid="search-input" placeholder="What are you looking for?" className="w-full border-0 bg-transparent p-0 font-display text-3xl font-semibold tracking-tight placeholder:text-muted-foreground focus:ring-0" />
                </div>

                {/* Instant suggestions */}
                {query.trim().length >= 2 && (
                  <div className="mt-6" data-testid="search-suggestions">
                    {sugLoading && suggestions.length === 0 && (
                      <p className="text-sm text-muted-foreground">Searching…</p>
                    )}
                    {!sugLoading && suggestions.length === 0 && (
                      <p className="text-sm text-muted-foreground">No matches for “{query}”. Press Enter to search anyway.</p>
                    )}
                    <div className="space-y-1">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => goToProduct(s.slug)}
                          data-testid={`suggestion-${s.slug}`}
                          className="flex w-full items-center gap-4 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface"
                        >
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-surface">
                            {s.images?.[0]?.url && <img src={s.images[0].url} alt={s.name} className="h-full w-full object-cover" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.category?.name}</p>
                          </div>
                          <span className="text-sm font-semibold">₹{parseFloat(s.price).toFixed(0)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {query.trim().length < 2 && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {['Hoodies', 'Jackets', 'Sneakers', 'Trousers'].map((t) => (
                    <button key={t} type="button" onClick={() => { navigate(`/products?search=${t}`); closeSearch(); }} className="border border-border px-5 py-2 text-xs uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">{t}</button>
                  ))}
                </div>
                )}
              </motion.form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Mobile Menu - Bottom Sheet Style */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[80]">
            {/* Dark Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setMenuOpen(false)} 
            />
            
            {/* Sliding Menu Panel */}
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-x-0 bottom-0 top-[15%] rounded-t-3xl bg-foreground text-white shadow-2xl overflow-y-auto"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full bg-white/30" />
              </div>

              <div className="container-luxe px-6 pb-6 pt-4">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                  <span className="font-display text-xl font-extrabold uppercase tracking-[0.2em]">Menu</span>
                  <button onClick={() => setMenuOpen(false)} data-testid="mobile-menu-close" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
                    <X size={20} />
                  </button>
                </div>
                
                {/* Main Navigation Links */}
                <nav className="space-y-1">
                  {NAV.map((n, i) => (
                    <motion.div 
                      key={n.label} 
                      initial={{ opacity: 0, x: -20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: 0.05 * i, type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <Link 
                        to={n.to} 
                        onClick={() => setMenuOpen(false)}
                        className="group flex items-center justify-between py-4 border-b border-white/10 text-2xl font-display font-bold tracking-tight transition-colors hover:text-gold"
                      >
                        {n.label}
                        <span className="text-2xl text-white/20 transition-all group-hover:translate-x-1 group-hover:text-gold">→</span>
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {/* User Profile & Actions Card */}
                <div className="mt-10 rounded-2xl bg-white/5 p-6 backdrop-blur-sm border border-white/10">
                  {isAuthenticated ? (
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 text-gold font-display text-xl font-bold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{user?.firstName} {user?.lastName}</p>
                        <p className="text-sm text-white/50">{user?.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 text-center">
                      <p className="text-sm text-white/50 mb-1">Welcome to StoreX</p>
                      <p className="text-xs text-white/30">Sign in for a personalized experience</p>
                    </div>
                  )}
                  
                  <div className="space-y-1 text-sm font-semibold uppercase tracking-luxe-sm">
                    <Link to="/wishlist" onClick={() => setMenuOpen(false)} className="flex items-center justify-between py-3 border-b border-white/10 hover:text-gold transition-colors">
                      <span>Wishlist</span> 
                      <span className="text-white/40 font-normal">({wishCount})</span>
                    </Link>
                    
                    {isAuthenticated ? (
                      <>
                        <Link to="/profile" onClick={() => setMenuOpen(false)} className="block py-3 border-b border-white/10 hover:text-gold transition-colors">My Account</Link>
                        {user?.role === 'ADMIN' && (
                          <Link to="/admin" onClick={() => setMenuOpen(false)} className="block py-3 border-b border-white/10 hover:text-gold transition-colors">Admin Dashboard</Link>
                        )}
                        <button onClick={() => { logout(); navigate('/'); setMenuOpen(false); }} className="block w-full text-left py-3 text-red-400 hover:text-red-300 transition-colors">
                          Logout
                        </button>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 pt-4">
                        <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 rounded-xl bg-white py-3 text-center text-black font-bold transition-opacity hover:opacity-80">
                          Sign In
                        </Link>
                        <Link to="/register" onClick={() => setMenuOpen(false)} className="flex-1 rounded-xl border border-white/30 py-3 text-center transition-colors hover:bg-white/10">
                          Register
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}