import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Download, XCircle, RotateCcw, CheckCircle2, Clock, Package, Truck, Home, ArrowRight, ShoppingCart, RotateCw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { STATUS_BADGE, STATUS_LABEL } from '../lib/returnStatus';
import ReorderSkippedModal from '../components/ReorderSkippedModal';

const TRACK_STEPS = [
  { key: 'PENDING', label: 'Placed', icon: Clock },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Home },
];

function OrderTracking({ order }) {
  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    return (
      <div data-testid="order-tracking" className="mb-8 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <XCircle size={20} />
        <span className="text-sm font-medium">This order was {order.status.toLowerCase()}{order.cancelledAt ? ` on ${new Date(order.cancelledAt).toLocaleDateString()}` : ''}.</span>
      </div>
    );
  }
  const currentIdx = TRACK_STEPS.findIndex((s) => s.key === order.status);
  const stamp = { SHIPPED: order.shippedAt, DELIVERED: order.deliveredAt };
  return (
    <div data-testid="order-tracking" className="mb-8">
      <div className="flex items-center justify-between">
        {TRACK_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex flex-1 flex-col items-center relative">
              {i > 0 && <div className={`absolute right-1/2 top-5 h-0.5 w-full ${i <= currentIdx ? 'bg-foreground' : 'bg-border'}`} />}
              <div className={`z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${done ? 'border-foreground bg-foreground text-white' : 'border-border bg-card text-muted-foreground'}`}>
                <Icon size={18} />
              </div>
              <span className={`mt-2 text-[11px] font-medium ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
              {stamp[step.key] && <span className="text-[10px] text-muted-foreground">{new Date(stamp[step.key]).toLocaleDateString()}</span>}
            </div>
          );
        })}
      </div>
      {order.trackingNumber && (
        <p className="mt-4 text-center text-xs text-muted-foreground">Tracking No: <span className="font-semibold text-foreground">{order.trackingNumber}</span></p>
      )}
    </div>
  );
}

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [order, setOrder] = useState(null);
  const [eligibility, setEligibility] = useState(null); // per-item eligibility array
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [acting, setActing] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [skippedInfo, setSkippedInfo] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data.order);
      // Only pull return eligibility for delivered orders (owner only).
      if (res.data.order?.status === 'DELIVERED' && user?.role !== 'ADMIN') {
        try {
          const el = await api.get(`/returns/eligibility/${id}`);
          setEligibility(el.data.items || []);
        } catch { /* non-fatal — customer just won't see the granular buttons */ }
      }
    } catch { toast.error('Failed to load order'); }
    finally { setLoading(false); }
  }, [id, user?.role]);

  useEffect(() => { load(); }, [load]);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download invoice');
    } finally { setDownloading(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setActing(true);
    try {
      await api.patch(`/orders/${id}/cancel`);
      toast.success('Order cancelled');
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to cancel');
    } finally { setActing(false); }
  };

  const handleReorder = async () => {
    setReordering(true);
    try {
      const res = await api.post(`/orders/${id}/reorder`);
      const { added, skipped, addedCount, skippedCount } = res.data || {};
      if (addedCount > 0) {
        toast.success(`${addedCount} product${addedCount === 1 ? '' : 's'} added to cart${skippedCount ? ` (${skippedCount} skipped)` : ''}`);
        try {
          const cs = (await import('../store/cartStore')).useCartStore.getState();
          await cs.fetchCart?.();
        } catch { /* non-blocking */ }
      } else {
        toast.error('No items could be added to your cart.');
      }
      if (skippedCount > 0) {
        setSkippedInfo({ added, skipped, orderNumber: order.orderNumber });
      } else if (addedCount > 0) {
        setTimeout(() => navigate('/cart'), 700);
      }
    } catch (e) {
      toast.error(e.message || 'Failed to reorder');
    } finally { setReordering(false); }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center">Loading order...</div>;
  if (!order) return <div className="text-center py-20">Order not found</div>;

  const isAdmin = user?.role === 'ADMIN';
  const canCancel = ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status);
  const canReturn = order.status === 'DELIVERED';
  const canReorder = !isAdmin && ['DELIVERED', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status);
  const openRequests = (order.returnRequests || []).filter((r) => !['CANCELLED', 'REJECTED', 'COMPLETED'].includes(r.status));
  const anyItemEligible = (eligibility || []).some((i) => i.isReturnable || i.isExchangeable);
  const isRefunded = order.payment?.status === 'REFUNDED' || order.status === 'REFUNDED';

  // Merge eligibility into displayed order items (only for owner + delivered).
  const eligibilityById = new Map((eligibility || []).map((e) => [e.orderItemId, e]));

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <button onClick={() => navigate(isAdmin ? '/admin' : '/orders')} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={20} /> Back to {isAdmin ? 'Dashboard' : 'Orders'}
      </button>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-muted/50 px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border">
          <div>
            <p className="text-sm text-muted-foreground">Order Number</p>
            <p className="text-xl font-bold text-foreground">{order.orderNumber}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium text-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <span data-testid="order-status-badge" className="px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">{order.status}</span>
          </div>
          <button onClick={handleDownloadInvoice} disabled={downloading} data-testid="download-invoice-btn" className="inline-flex items-center gap-2 border border-foreground px-5 py-2.5 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white disabled:opacity-50">
            <Download size={15} /> {downloading ? 'Preparing…' : 'Invoice'}
          </button>
        </div>

        <div className="p-8">
          <OrderTracking order={order} />

          {/* Post-purchase actions */}
          {!isAdmin && (canCancel || canReturn || canReorder || openRequests.length || isRefunded) && (
            <div className="mb-8 rounded-xl border border-border p-5">
              <div className="flex flex-wrap items-center gap-3">
                {canCancel && (
                  <button onClick={handleCancel} disabled={acting} data-testid="cancel-order-btn" className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                    <XCircle size={15} /> Cancel Order
                  </button>
                )}
                {canReturn && anyItemEligible && (
                  <Link to={`/orders/${id}/return`} data-testid="return-order-btn" className="inline-flex items-center gap-2 rounded-lg border border-foreground px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-foreground hover:text-white">
                    <RotateCcw size={15} /> Return / Exchange
                  </Link>
                )}
                {canReorder && (
                  <button onClick={handleReorder} disabled={reordering} data-testid="buy-again-btn" className="inline-flex items-center gap-2 rounded-lg border border-foreground bg-foreground text-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-opacity hover:opacity-90 disabled:opacity-50">
                    {reordering ? <><RotateCw size={15} className="animate-spin"/> Adding…</> : <><ShoppingCart size={15}/> Buy Again</>}
                  </button>
                )}
                {isRefunded && (
                  <span data-testid="refund-badge" className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-green-700">
                    <CheckCircle2 size={15} /> Refund Processed
                  </span>
                )}
              </div>

              {/* Existing requests summary */}
              {openRequests.length > 0 && (
                <div className="mt-4 space-y-2" data-testid="return-status">
                  {openRequests.map((r) => (
                    <Link to={`/returns/${r.id}`} key={r.id} className="flex items-center justify-between rounded-lg bg-muted/40 hover:bg-muted transition-colors p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.type === 'EXCHANGE' ? 'Exchange' : 'Return'} request</p>
                        <p className="text-xs text-muted-foreground">Reason: {r.reason}{r.refundAmount ? ` · Refund ₹${parseFloat(r.refundAmount).toFixed(2)}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-700'}`}>{STATUS_LABEL[r.status] || r.status}</span>
                        <ArrowRight size={14} className="text-muted-foreground"/>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {canReturn && !anyItemEligible && eligibility && (
                <p className="mt-4 text-xs text-muted-foreground">All items in this order are already requested or the return window has closed.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-foreground mb-4">Items Ordered</h3>
              <div className="space-y-4">
                {order.items.map((item) => {
                  const el = eligibilityById.get(item.id);
                  return (
                    <div key={item.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                      <img src={item.image} className="w-16 h-16 object-cover rounded-lg bg-muted" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.name}</p>
                        {item.size && <p className="text-sm text-muted-foreground" data-testid={`order-item-size-${item.id}`}>Size: <span className="font-semibold text-foreground">{item.size}</span></p>}
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity} x ₹{parseFloat(item.price).toFixed(2)}</p>
                        {el && !isAdmin && (
                          <div className="mt-1 text-[11px]">
                            {el.isReturnable || el.isExchangeable ? (
                              <Link to={`/orders/${id}/return`} data-testid={`item-return-link-${item.id}`} className="inline-flex items-center gap-1 text-foreground hover:underline">
                                <RotateCcw size={12}/> {el.isReturnable && el.isExchangeable ? 'Return / Exchange' : el.isReturnable ? 'Return' : 'Exchange'}
                              </Link>
                            ) : el.reasonIfBlocked ? (
                              <span className="text-muted-foreground italic">{el.reasonIfBlocked}</span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-foreground">₹{parseFloat(item.subtotal).toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-foreground mb-4">Shipping Address</h3>
              {order.address && (
                <div className="flex items-start gap-3 text-sm text-muted-foreground mb-8 bg-muted/50 p-4 rounded-lg">
                  <MapPin size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">{order.address.firstName} {order.address.lastName}</p>
                    <p>Phone: {order.address?.phone || 'N/A'}</p>
                    <p>{order.address.addressLine1}</p>
                    <p>{order.address.city}, {order.address.state} {order.address.postalCode}</p>
                    <p>{order.address.country}</p>
                  </div>
                </div>
              )}

              <h3 className="font-bold text-foreground mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{parseFloat(order.subtotal).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span className="font-medium">{order.paymentMethod === 'RAZORPAY' ? 'Online Payment (Razorpay)' : 'Cash on Delivery'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>₹{parseFloat(order.shippingCost).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>₹{parseFloat(order.tax).toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold border-t border-border pt-2 mt-2"><span>Total</span><span>₹{parseFloat(order.total).toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReorderSkippedModal
        open={!!skippedInfo}
        onClose={() => setSkippedInfo(null)}
        onGoToCart={() => { setSkippedInfo(null); navigate('/cart'); }}
        info={skippedInfo}
      />
    </div>
  );
}
