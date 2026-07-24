import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { fmtPrice } from '../components/ProductCard';
import { Tag, X, Truck, Receipt, ShieldCheck, User } from 'lucide-react';

const input = 'w-full border-0 border-b border-input bg-transparent px-0 py-2.5 text-sm focus:border-foreground focus:ring-0';
const label = 'overline text-muted-foreground';

export default function CheckoutPage() {
  const { items, total: cartSubtotal, fetchCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isGuest = user?.isGuest;

  const [form, setForm] = useState({ 
    firstName: '', 
    lastName: '', 
    phone: '', 
    email: '',
    addressLine1: '', 
    city: '', 
    state: '', 
    postalCode: '', 
    country: 'IN' 
  });
  const [paymentMethod, setPaymentMethod] = useState('ONLINE');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const loadScript = () => {
      return new Promise((resolve) => {
        if (window.Razorpay) { setScriptLoaded(true); resolve(true); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => { setScriptLoaded(true); resolve(true); };
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };
    loadScript();
  }, []);

  const tax = cartSubtotal * 0.18;
  const shipping = cartSubtotal > 500 ? 0 : 99;
  const finalTotal = Math.max(0, cartSubtotal + tax + shipping - discount).toFixed(2);
  const updateForm = (field, value) => setForm({ ...form, [field]: value });

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.post('/coupons/validate', { 
        code: couponCode, 
        subtotal: cartSubtotal 
      });

      const couponData = res.data;
      setDiscount(parseFloat(couponData.discount));
      setAppliedCoupon(couponData);
      toast.success(couponData.message);
    } catch (error) {
      setDiscount(0);
      setAppliedCoupon(null);
      toast.error(error.message || 'Invalid coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setDiscount(0);
    toast('Coupon removed');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Guest checkout: attach contact details to the guest account first
      if (isGuest) {
        if (!form.email) { toast.error('Please enter your email'); setLoading(false); return; }
        const gr = await api.patch('/auth/guest-details', {
          email: form.email, firstName: form.firstName, lastName: form.lastName, phone: form.phone,
        });
        useAuthStore.setState({ user: { ...user, ...gr.data.user } });
      }

      const orderPayload = { 
        ...form, 
        paymentMethod: paymentMethod === 'COD' ? 'CASH_ON_DELIVERY' : 'RAZORPAY',
        couponCode: appliedCoupon?.code || null
      };

      if (paymentMethod === 'COD') {
        const response = await api.post('/orders', orderPayload);
        toast.success('Order placed successfully!');
        await fetchCart();
        navigate(`/payment/success?orderId=${response.data.order.id}`);
      } else {
        const res = await api.post('/payments/create-razorpay-order', { ...form, couponCode: appliedCoupon?.code });

        if (!res.data || !res.data.key) {
          throw new Error("Failed to initialize payment gateway.");
        }

        const options = {
          key: res.data.key,
          amount: res.data.amount,
          currency: res.data.currency,
          name: res.data.name,
          description: res.data.description,
          order_id: res.data.order_id,
          prefill: res.data.prefill,
          theme: res.data.theme,
          handler: async function (response) {
            try {
              await api.post('/payments/verify-razorpay', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: res.data.orderId
              });

              await fetchCart();
              toast.success('Payment successful!');
              navigate(`/payment/success?orderId=${res.data.orderId}`);
            } catch (err) {
              toast.error(err.message || 'Unknown verification error');
            }
          },
          modal: {
            ondismiss: function () {
              toast.error('Payment cancelled');
              setLoading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to initiate payment');
    } finally { setLoading(false); }
  };

  if (items.length === 0) {
    return (
      <div className="container-luxe flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">Your bag is empty</h1>
        <button onClick={() => navigate('/products')} className="border border-foreground px-9 py-4 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white">Go Shopping</button>
      </div>
    );
  }

  return (
    <div className="container-luxe py-14">
      <h1 className="mb-12 font-display text-3xl font-bold tracking-tight">Checkout</h1>

      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        {/* LEFT: Form */}
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Shipping */}
          <div className="space-y-6">
            <h2 className="font-display text-lg font-semibold">Shipping Address</h2>
            {isGuest && (
              <div className="rounded-lg border border-border bg-surface p-4" data-testid="guest-checkout-banner">
                <p className="flex items-center gap-2 text-sm font-medium"><User size={15} /> Checking out as a guest</p>
                <p className="mt-1 text-xs text-muted-foreground">Enter your email for the order confirmation & invoice. <button type="button" onClick={() => navigate('/login')} className="link-underline font-semibold text-foreground">Sign in instead</button></p>
                <div className="mt-3"><label className={label}>Email</label><input required type="email" data-testid="guest-email" className={input} value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="you@example.com" /></div>
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-2">
              <div><label className={label}>First Name</label><input required className={input} value={form.firstName} onChange={(e) => updateForm('firstName', e.target.value)} /></div>
              <div><label className={label}>Last Name</label><input required className={input} value={form.lastName} onChange={(e) => updateForm('lastName', e.target.value)} /></div>
              <div><label className={label}>Phone</label><input required type="tel" className={input} value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={label}>Address</label><input required className={input} value={form.addressLine1} onChange={(e) => updateForm('addressLine1', e.target.value)} /></div>
              <div><label className={label}>City</label><input required className={input} value={form.city} onChange={(e) => updateForm('city', e.target.value)} /></div>
              <div><label className={label}>State</label><input required className={input} value={form.state} onChange={(e) => updateForm('state', e.target.value)} /></div>
              <div><label className={label}>Postal Code</label><input required className={input} value={form.postalCode} onChange={(e) => updateForm('postalCode', e.target.value)} /></div>
              <div><label className={label}>Country</label><input required className={input} value={form.country} onChange={(e) => updateForm('country', e.target.value)} /></div>
            </div>
          </div>

          {/* Payment */}
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Payment Method</h2>
            <div className="flex gap-4">
              <button type="button" onClick={() => setPaymentMethod('ONLINE')} className={`flex-1 border p-4 text-left transition-colors ${paymentMethod === 'ONLINE' ? 'border-foreground bg-surface' : 'border-border'}`}>
                <div className="font-semibold text-sm">Pay Online</div>
                <div className="text-xs text-muted-foreground mt-1">Credit/Debit Card, UPI, NetBanking</div>
              </button>
              <button type="button" onClick={() => setPaymentMethod('COD')} className={`flex-1 border p-4 text-left transition-colors ${paymentMethod === 'COD' ? 'border-foreground bg-surface' : 'border-border'}`}>
                <div className="font-semibold text-sm">Cash on Delivery</div>
                <div className="text-xs text-muted-foreground mt-1">Pay when you receive</div>
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-foreground py-4 text-[11px] font-semibold uppercase tracking-luxe-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            {loading ? 'Processing...' : paymentMethod === 'COD' ? 'Place Order' : 'Pay Securely'}
          </button>
        </form>

        {/* RIGHT: Order Summary */}
        <div className="space-y-6">
          <h2 className="font-display text-lg font-semibold">Order Summary</h2>

          {/* Items */}
          <div className="space-y-4 border-b border-border pb-6">
            {items.map(item => (
              <div key={item.id} className="flex gap-4">
                <img src={item.product?.images?.[0]?.url} alt={item.product?.name} className="h-16 w-16 rounded-md object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.product?.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold">{fmtPrice(parseFloat(item.product?.price) * item.quantity)}</p>
              </div>
            ))}
          </div>

          {/* Coupon */}
          <div className="border-b border-border pb-6">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-700">{appliedCoupon.code}</p>
                    <p className="text-xs text-green-600">You saved {fmtPrice(discount)}</p>
                  </div>
                </div>
                <button onClick={handleRemoveCoupon} className="p-1 hover:bg-green-100 rounded">
                  <X size={16} className="text-green-600" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Enter coupon code" 
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-sm uppercase"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                />
                <button 
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2 border border-foreground text-[11px] font-semibold uppercase tracking-luxe-sm hover:bg-foreground hover:text-white transition-colors disabled:opacity-50"
                >
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtPrice(cartSubtotal)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1"><Tag size={14} /> Discount</span>
                <span>-{fmtPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Truck size={14} /> Shipping</span><span>{shipping === 0 ? 'Free' : fmtPrice(shipping)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Receipt size={14} /> Tax (18%)</span><span>{fmtPrice(tax)}</span></div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{fmtPrice(finalTotal)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={14} />
            <span>Secure checkout powered by Razorpay</span>
          </div>
        </div>
      </div>
    </div>
  );
}