import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import MobileNav from './components/layout/MobileNav';
import Home from './pages/Home';
import Products from './pages/Products';
import Login from './pages/Login';
import Register from './pages/Register';
import AddProduct from './pages/admin/AddProduct';
import ProductDetails from './pages/ProductDetails';
import CheckoutPage from './pages/CheckoutPage';
import Orders from './pages/Orders';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import ProductList from './pages/admin/ProductList';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminInventory from './pages/admin/AdminInventory';
import AdminReturns from './pages/admin/AdminReturns';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import Profile from './pages/Profile';
import OrderDetails from './pages/OrderDetails';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  return (
    <main className={`flex-1 ${isHome ? '' : 'pt-20'} pb-20 lg:pb-0`}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Page><Home /></Page>} />
          <Route path="/products" element={<Page><Products /></Page>} />
          <Route path="/products/:slug" element={<Page><ProductDetails /></Page>} />
          <Route path="/cart" element={<Page><Cart /></Page>} />
          <Route path="/wishlist" element={<Page><Wishlist /></Page>} />
          <Route path="/checkout" element={<Page><CheckoutPage /></Page>} />
          <Route path="/login" element={<Page><Login /></Page>} />
          <Route path="/register" element={<Page><Register /></Page>} />
          <Route path="/forgot-password" element={<Page><ForgotPassword /></Page>} />
          <Route path="/reset-password" element={<Page><ResetPassword /></Page>} />
          <Route path="/verify-email" element={<Page><VerifyEmail /></Page>} />
          <Route path="/orders" element={<Page><Orders /></Page>} />
          <Route path="/orders/:id" element={<Page><OrderDetails /></Page>} />
          <Route path="/profile" element={<Page><Profile /></Page>} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<Page><PaymentCancel /></Page>} />
          <Route path="/admin/add-product" element={<ProtectedAdminRoute><AddProduct /></ProtectedAdminRoute>} />
          <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductList />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="add-product" element={<AddProduct />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="returns" element={<AdminReturns />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { borderRadius: '0px', background: '#111111', color: '#fff', fontSize: '13px', letterSpacing: '0.02em', padding: '12px 18px' },
          }}
        />
        <Header />
        <AnimatedRoutes />
        <Footer />
        <MobileNav 
          onOpenSearch={() => window.dispatchEvent(new Event('open-search'))} 
          onOpenCategories={() => window.dispatchEvent(new Event('open-categories'))}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;