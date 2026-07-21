import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Package, Heart, MapPin, Tag, Trophy, 
  Star, Move, Bell, Settings, LogOut, User, ChevronRight, Edit3, Lock,
  ShoppingCart, Trash2
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  EmptyState, SkeletonCard, StatCard, SectionTitle, ComingSoonCard 
} from '../components/profile/ProfileUI';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Min 8 characters'),
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: 'New password must be different',
  path: ['newPassword'],
});

const sidebarLinks = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'rewards', label: 'Rewards', icon: Trophy },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'measurements', label: 'Measurements', icon: Move },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function extractArray(response) {
  if (!response || !response.data) return [];
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.items && Array.isArray(data.items)) return data.items;
  if (data.orders && Array.isArray(data.orders)) return data.orders;
  if (data.data?.orders && Array.isArray(data.data.orders)) return data.data.orders;
  return [];
}

// Helper: Update localStorage wishlist and dispatch event for Header sync
const syncLocalWishlist = (wishlistItems) => {
  const formatted = wishlistItems.map(item => ({
    id: item.product?.id || item.productId || item.id,
    name: item.product?.name || item.name,
    slug: item.product?.slug || item.slug,
    price: item.product?.price || item.price,
    comparePrice: item.product?.comparePrice || item.comparePrice,
    image: item.product?.images?.[0]?.url || item.image,
    category: item.product?.category?.name || item.category,
  })).filter(i => i.id);

  localStorage.setItem('storex-wishlist', JSON.stringify(formatted));
  window.dispatchEvent(new Event('wishlist-updated'));
};

const Sidebar = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, onLogout }) => (
  <div className={`lg:block fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 border-r border-border transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="p-8 border-b border-border flex items-center justify-between">
      <h2 className="font-display text-xl font-bold tracking-tight">My Account</h2>
      <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-gray-500">✕</button>
    </div>
    <nav className="p-4 space-y-1">
      {sidebarLinks.map((link) => (
        <button
          key={link.id}
          onClick={() => { setActiveTab(link.id); setIsMobileMenuOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
            activeTab === link.id
              ? 'bg-surface text-foreground border border-foreground/10'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-foreground'
          }`}
        >
          <link.icon size={18} className={`transition-colors ${activeTab === link.id ? 'text-foreground' : 'text-gray-400 group-hover:text-foreground'}`} />
          {link.label}
          {activeTab === link.id && <ChevronRight size={16} className="ml-auto text-foreground" />}
        </button>
      ))}
      <div className="pt-4 mt-4 border-t border-border">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </nav>
  </div>
);

const ProfileHeader = ({ user, setActiveTab }) => (
  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-100 via-white to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border border-border p-8 mb-8">
    <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center overflow-hidden">
        {user?.avatar ? (
          <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User size={40} className="text-gray-400" />
        )}
      </div>
      <div className="text-center sm:text-left flex-1">
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
          {user?.firstName} {user?.lastName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
        <div className="flex items-center gap-3 mt-3 justify-center sm:justify-start">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-border">
            Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2024'}
          </span>
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            {user?.role || 'GOLD'} TIER
          </span>
        </div>
      </div>
      <button 
        onClick={() => setActiveTab('settings')}
        className="flex items-center gap-2 border border-foreground px-5 py-2.5 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white"
      >
        <Edit3 size={14} />
        Edit Profile
      </button>
    </div>
  </div>
);

const DashboardTab = ({ orders, wishlist, loading, setActiveTab, navigate }) => (
  <div>
    <SectionTitle>Account Overview</SectionTitle>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
      <div onClick={() => setActiveTab('orders')} className="cursor-pointer hover:scale-105 transition-transform">
        <StatCard title="Total Orders" value={orders.length || 0} icon={Package} color="bg-blue-100 text-blue-600" />
      </div>
      <div onClick={() => setActiveTab('wishlist')} className="cursor-pointer hover:scale-105 transition-transform">
        <StatCard title="Wishlist Items" value={wishlist.length || 0} icon={Heart} color="bg-red-100 text-red-600" />
      </div>
      <div onClick={() => setActiveTab('coupons')} className="cursor-pointer hover:scale-105 transition-transform">
        <StatCard title="Coupons" value="0" icon={Tag} color="bg-green-100 text-green-600" />
      </div>
      <div onClick={() => setActiveTab('rewards')} className="cursor-pointer hover:scale-105 transition-transform">
        <StatCard title="Reward Points" value="1,250" icon={Trophy} color="bg-purple-100 text-purple-600" />
      </div>
    </div>

    <SectionTitle>Recent Orders</SectionTitle>
    {loading ? (
      <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
    ) : orders.length > 0 ? (
      <div className="space-y-4">
        {orders.slice(0, 3).map(order => (
          <div 
            key={order.id} 
            onClick={() => navigate(`/orders/${order.id}`)}
            className="flex items-center justify-between p-5 border border-border rounded-xl hover:shadow-md transition-shadow bg-white dark:bg-gray-800 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                {order.items?.[0]?.image ? <img src={order.items[0].image} alt="" className="w-full h-full object-cover" /> : <Package size={20} className="m-auto text-gray-400" />}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900 dark:text-white">₹{parseFloat(order.total).toFixed(2)}</p>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full mt-1 inline-block ${order.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {order.status}
              </span>
            </div>
          </div>
        ))}
        <button 
          onClick={() => setActiveTab('orders')}
          className="w-full text-center text-sm font-semibold text-gray-500 hover:text-foreground py-3 border border-border rounded-xl transition-colors hover:bg-surface"
        >
          View All Orders →
        </button>
      </div>
    ) : (
      <EmptyState 
        icon={Package} 
        title="No orders yet" 
        description="Looks like you haven't placed any orders. Start shopping to see them here." 
        action="Shop Now"
        actionLink="/products"
      />
    )}
  </div>
);

const OrdersTab = ({ orders, loading, navigate }) => (
  <div>
    <SectionTitle>Order History</SectionTitle>
    {loading ? (
      <div className="space-y-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
    ) : orders.length > 0 ? (
      <div className="space-y-4">
        {orders.map(order => (
          <motion.div 
            key={order.id} 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            onClick={() => navigate(`/orders/${order.id}`)}
            className="p-6 border border-border rounded-xl bg-white dark:bg-gray-800 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-display font-bold text-gray-900 dark:text-white">{order.orderNumber}</h3>
                <p className="text-xs text-muted-foreground mt-1">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${order.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{order.status}</span>
                <p className="font-display text-lg font-bold text-gray-900 dark:text-white">₹{parseFloat(order.total).toFixed(2)}</p>
              </div>
            </div>
            <div className="space-y-3">
              {order.items?.map(item => (
                <div key={item.id} className="flex items-center gap-4">
                  <img src={item.image || 'https://via.placeholder.com/56'} className="w-14 h-14 rounded-md object-cover border border-gray-100 dark:border-gray-700" alt={item.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} • ₹{parseFloat(item.price).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    ) : (
      <EmptyState 
        icon={Package} 
        title="No orders found" 
        description="You haven't placed any orders yet." 
        action="Start Shopping"
        actionLink="/products"
      />
    )}
  </div>
);

const WishlistTab = ({ wishlist, loading, onRemove, onMoveToCart }) => (
  <div>
    <SectionTitle>My Wishlist ({wishlist.length})</SectionTitle>
    {loading ? (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
    ) : wishlist.length > 0 ? (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {wishlist.map(item => (
          <motion.div 
            key={item.id} 
            whileHover={{ y: -5 }} 
            className="group border border-border rounded-xl overflow-hidden bg-white dark:bg-gray-800 hover:shadow-lg transition-all duration-300"
          >
            <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
              <img 
                src={item.product?.images?.[0]?.url || item.product?.image || item.image || 'https://via.placeholder.com/200'} 
                alt={item.product?.name || item.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(item); }}
                className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.product?.name || item.name}</h3>
              <p className="text-lg font-display font-bold mt-2">
                ₹{parseFloat(item.product?.price || item.price || 0).toFixed(2)}
              </p>
              <button 
                onClick={() => onMoveToCart(item)}
                className="w-full mt-3 flex items-center justify-center gap-2 border border-foreground py-2 text-[11px] font-semibold uppercase tracking-luxe-sm hover:bg-foreground hover:text-white transition-colors"
              >
                <ShoppingCart size={14} />
                Move to Cart
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    ) : (
      <EmptyState 
        icon={Heart} 
        title="Your wishlist is empty" 
        description="Save items you love for later." 
        action="Explore Products"
        actionLink="/products"
      />
    )}
  </div>
);

const SettingsTab = ({ user }) => {
  const [settingsView, setSettingsView] = useState('info');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(passwordSchema) });

  const onPasswordSubmit = async (data) => {
    try {
      await api.patch('/users/password', data);
      toast.success('Password updated successfully!');
      reset();
    } catch (error) {
      toast.error(error.message || 'Failed to update password');
    }
  };

  return (
    <div className="max-w-2xl">
      <SectionTitle>Account Settings</SectionTitle>
      <div className="flex gap-6 mb-8 border-b border-border">
        <button onClick={() => setSettingsView('info')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${settingsView === 'info' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Profile Information</button>
        <button onClick={() => setSettingsView('password')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${settingsView === 'password' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Change Password</button>
      </div>
      {settingsView === 'info' && (
        <div className="bg-white dark:bg-gray-800 border border-border rounded-2xl p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border-2 border-border">
              {user?.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={32} className="text-gray-400" />}
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white capitalize">{user?.firstName} {user?.lastName}</h2>
              <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
              <span className="text-xs bg-surface text-foreground px-2.5 py-0.5 rounded-full mt-2 uppercase font-semibold border border-border">{user?.role}</span>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">Profile information (Name/Email) can currently only be updated by an Administrator via the Admin Panel.</p>
          </div>
        </div>
      )}
      {settingsView === 'password' && (
        <form onSubmit={handleSubmit(onPasswordSubmit)} className="bg-white dark:bg-gray-800 border border-border rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock size={20} className="text-muted-foreground" />
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">Update Password</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Current Password</label>
            <input type="password" {...register('currentPassword')} className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground focus:ring-2 focus:ring-foreground outline-none" />
            {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
            <input type="password" {...register('newPassword')} className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground focus:ring-2 focus:ring-foreground outline-none" />
            {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-foreground text-white rounded-xl font-semibold uppercase tracking-luxe-sm text-[12px] hover:opacity-90 disabled:opacity-50 transition-opacity">
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
};

export default function Profile() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!['dashboard', 'orders', 'wishlist'].includes(activeTab)) return;
      setLoading(true);

      let ordersRes = null;
      try {
        ordersRes = await api.get('/orders/my-orders');
      } catch (err1) {
        try {
          ordersRes = await api.get('/orders');
        } catch (err2) {
          console.error('❌ Both order endpoints failed:', err2.message);
        }
      }

      if (ordersRes) {
        const parsedOrders = extractArray(ordersRes);
        setOrders(parsedOrders);
      }

      let wishlistRes = null;
      try {
        wishlistRes = await api.get('/wishlist');
        console.log('❤️ Raw Wishlist Response:', wishlistRes);
      } catch (err1) {
        console.warn('⚠️ Wishlist endpoint not found');
      }

      if (wishlistRes) {
        const parsedWishlist = extractArray(wishlistRes);
        console.log('✅ Parsed Wishlist:', parsedWishlist);
        setWishlist(parsedWishlist);
        // Sync with localStorage so Header shows correct count
        syncLocalWishlist(parsedWishlist);
      }

      setLoading(false);
    };
    fetchData();
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleRemoveFromWishlist = async (item) => {
    const productId = item.productId || item.product?.id || item.id;

    try {
      // Remove from backend
      await api.delete(`/wishlist/${productId}`);

      // Update local state
      const updated = wishlist.filter(w => w.id !== item.id);
      setWishlist(updated);

      // Sync localStorage + dispatch event so Header updates
      syncLocalWishlist(updated);

      toast.success('Removed from wishlist');
    } catch (err) {
      console.error('Remove failed:', err);
      toast.error('Failed to remove item');
    }
  };

  const handleMoveToCart = async (item) => {
    const productId = item.productId || item.product?.id || item.id;

    if (!productId) {
      toast.error('Product ID not found');
      return;
    }

    try {
      await api.post('/cart', { productId, quantity: 1 });
      await api.delete(`/wishlist/${productId}`);

      const updated = wishlist.filter(w => w.id !== item.id);
      setWishlist(updated);
      syncLocalWishlist(updated);

      const cartStore = (await import('../store/cartStore')).useCartStore.getState();
      await cartStore.fetchCart();

      toast.success('Moved to cart!');
      window.dispatchEvent(new Event('open-cart'));
    } catch (err) {
      console.error('Move to cart failed:', err);
      toast.error(err?.message || 'Failed to move to cart');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden fixed inset-0 bg-black/50 z-40" />}

      <div className="container-luxe pt-10 lg:pt-14 pb-14">

        <div className="lg:hidden flex items-center justify-between mb-8">
          <h1 className="font-display text-2xl font-bold">My Account</h1>
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="p-3 rounded-lg border border-border hover:bg-surface"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="flex gap-10">
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen} 
            onLogout={handleLogout} 
          />

          <div className="flex-1 lg:ml-0 min-h-screen">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'dashboard' && <ProfileHeader user={user} setActiveTab={setActiveTab} />}

                <div className="mt-8">
                  {activeTab === 'dashboard' && (
                    <DashboardTab 
                      orders={orders} 
                      wishlist={wishlist} 
                      loading={loading} 
                      setActiveTab={setActiveTab}
                      navigate={navigate}
                    />
                  )}
                  {activeTab === 'orders' && <OrdersTab orders={orders} loading={loading} navigate={navigate} />}
                  {activeTab === 'wishlist' && (
                    <WishlistTab 
                      wishlist={wishlist} 
                      loading={loading} 
                      onRemove={handleRemoveFromWishlist}
                      onMoveToCart={handleMoveToCart}
                    />
                  )}
                  {activeTab === 'settings' && <SettingsTab user={user} />}

                  {activeTab === 'addresses' && <EmptyState icon={MapPin} title="No saved addresses" description="Add your shipping addresses for a faster checkout experience." action="Add Address" actionLink="/checkout" />}
                  {activeTab === 'coupons' && <EmptyState icon={Tag} title="No coupons available" description="You don't have any coupons right now. Check back later for exclusive offers!" />}
                  {activeTab === 'rewards' && <ComingSoonCard title="Loyalty Rewards" description="Earn points on every purchase and redeem them for exclusive discounts." icon={Trophy} />}
                  {activeTab === 'reviews' && <EmptyState icon={Star} title="No reviews yet" description="Share your thoughts on products you've purchased to help other customers." />}
                  {activeTab === 'measurements' && <ComingSoonCard title="Size & Measurements" description="Save your body measurements for a personalized sizing recommendation." icon={Move} />}
                  {activeTab === 'notifications' && <EmptyState icon={Bell} title="All caught up!" description="You don't have any new notifications at the moment." />}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}