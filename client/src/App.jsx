import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import MobileNav from './components/layout/MobileNav';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import { PageSkeleton } from './components/Skeleton';

// Route-level code-splitting for faster initial load (better Core Web Vitals)
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AddProduct = lazy(() => import('./pages/admin/AddProduct'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const Orders = lazy(() => import('./pages/Orders'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const ProductList = lazy(() => import('./pages/admin/ProductList'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminReturns = lazy(() => import('./pages/admin/AdminReturns'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'));
const Profile = lazy(() => import('./pages/Profile'));
const OrderDetails = lazy(() => import('./pages/OrderDetails'));
const Cart = lazy(() => import('./pages/Cart'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ReturnRequestForm = lazy(() => import('./pages/ReturnRequestForm'));
const MyReturns = lazy(() => import('./pages/MyReturns'));
const ReturnDetails = lazy(() => import('./pages/ReturnDetails'));

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
      <Suspense fallback={<PageSkeleton />}>
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
            <Route path="/orders/:orderId/return" element={<Page><ReturnRequestForm /></Page>} />
            <Route path="/returns" element={<Page><MyReturns /></Page>} />
            <Route path="/returns/:id" element={<Page><ReturnDetails /></Page>} />
            <Route path="/profile" element={<Page><Profile /></Page>} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<Page><PaymentCancel /></Page>} />
            <Route path="/admin/add-product" element={<ProtectedAdminRoute><AddProduct /></ProtectedAdminRoute>} />
            <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProductList />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="add-product" element={<AddProduct />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="returns" element={<AdminReturns />} />
            </Route>
          </Routes>
        </AnimatePresence>
      </Suspense>
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
