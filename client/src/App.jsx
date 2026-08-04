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
const AdminNewsletter = lazy(() => import('./pages/admin/AdminNewsletter'));
const AdminEmailTemplates = lazy(() => import('./pages/admin/AdminEmailTemplates'));
const AdminContact = lazy(() => import('./pages/admin/AdminContact'));
const AdminCareers = lazy(() => import('./pages/admin/AdminCareers'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminImportExport = lazy(() => import('./pages/admin/AdminImportExport'));
const AdminLoyalty = lazy(() => import('./pages/admin/AdminLoyalty'));
const AdminReferrals = lazy(() => import('./pages/admin/AdminReferrals'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
// Public marketing pages
const Contact = lazy(() => import('./pages/Contact'));
const Careers = lazy(() => import('./pages/Careers'));
const Press = lazy(() => import('./pages/Press'));
const OurStory = lazy(() => import('./pages/OurStory'));
const Sustainability = lazy(() => import('./pages/Sustainability'));
const Shipping = lazy(() => import('./pages/Shipping'));
const ReturnsPolicy = lazy(() => import('./pages/ReturnsPolicy'));
const SizeGuide = lazy(() => import('./pages/SizeGuide'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'));
const Profile = lazy(() => import('./pages/Profile'));
import CustomerOnlyRoute from './components/CustomerOnlyRoute';
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
            <Route path="/profile" element={<CustomerOnlyRoute><Page><Profile /></Page></CustomerOnlyRoute>} />
            <Route path="/loyalty" element={<CustomerOnlyRoute><Page><Profile /></Page></CustomerOnlyRoute>} />
            <Route path="/referrals" element={<CustomerOnlyRoute><Page><Profile /></Page></CustomerOnlyRoute>} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<Page><PaymentCancel /></Page>} />

            {/* Public marketing / info pages */}
            <Route path="/contact"        element={<Page><Contact /></Page>} />
            <Route path="/careers"        element={<Page><Careers /></Page>} />
            <Route path="/press"          element={<Page><Press /></Page>} />
            <Route path="/about"          element={<Page><OurStory /></Page>} />
            <Route path="/sustainability" element={<Page><Sustainability /></Page>} />
            <Route path="/shipping"       element={<Page><Shipping /></Page>} />
            <Route path="/returns-policy" element={<Page><ReturnsPolicy /></Page>} />
            <Route path="/size-guide"     element={<Page><SizeGuide /></Page>} />
            <Route path="/unauthorized"   element={<Page><Unauthorized /></Page>} />
            <Route path="/admin/add-product" element={<ProtectedAdminRoute perm="product.create"><AddProduct /></ProtectedAdminRoute>} />
            <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProtectedAdminRoute perm="product.view"><ProductList /></ProtectedAdminRoute>} />
              <Route path="orders" element={<ProtectedAdminRoute perm="order.view"><AdminOrders /></ProtectedAdminRoute>} />
              <Route path="inventory" element={<ProtectedAdminRoute perm="inventory.view"><AdminInventory /></ProtectedAdminRoute>} />
              <Route path="analytics" element={<ProtectedAdminRoute perm="analytics.view"><AdminAnalytics /></ProtectedAdminRoute>} />
              <Route path="add-product" element={<ProtectedAdminRoute perm="product.create"><AddProduct /></ProtectedAdminRoute>} />
              <Route path="coupons" element={<ProtectedAdminRoute perm="coupon.view"><AdminCoupons /></ProtectedAdminRoute>} />
              <Route path="returns" element={<ProtectedAdminRoute perm="return.view"><AdminReturns /></ProtectedAdminRoute>} />
              <Route path="newsletter" element={<ProtectedAdminRoute perm="newsletter.view"><AdminNewsletter /></ProtectedAdminRoute>} />
              <Route path="email-templates" element={<ProtectedAdminRoute perm="email_template.view"><AdminEmailTemplates /></ProtectedAdminRoute>} />
              <Route path="contact" element={<ProtectedAdminRoute perm="contact.view"><AdminContact /></ProtectedAdminRoute>} />
              <Route path="careers" element={<ProtectedAdminRoute perm="career.view"><AdminCareers /></ProtectedAdminRoute>} />
              <Route path="users" element={<ProtectedAdminRoute perm="user.view"><AdminUsers /></ProtectedAdminRoute>} />
              <Route path="audit-logs" element={<ProtectedAdminRoute perm="audit_log.view"><AdminAuditLogs /></ProtectedAdminRoute>} />
              <Route path="import-export" element={<ProtectedAdminRoute anyOf={["import","export"]}><AdminImportExport /></ProtectedAdminRoute>} />
              <Route path="loyalty" element={<ProtectedAdminRoute perm="loyalty.view"><AdminLoyalty /></ProtectedAdminRoute>} />
              <Route path="referrals" element={<ProtectedAdminRoute perm="referral.view"><AdminReferrals /></ProtectedAdminRoute>} />
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
