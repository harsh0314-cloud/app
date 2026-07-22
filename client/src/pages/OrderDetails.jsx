import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Download, XCircle, RotateCcw, CheckCircle2, Clock, Package, Truck, Home } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

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
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [acting, setActing] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [returnType, setReturnType] = useState('RETURN');
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/orders/${id}`)
      .then((res) => setOrder(res.data.order))
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false));
  }, [id]);

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

  const handleReturn = async (e) => {
    e.preventDefault();
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }
    setActing(true);
    try {
      await api.post(`/orders/${id}/return`, { type: returnType, reason });
      toast.success(`${returnType === 'EXCHANGE' ? 'Exchange' : 'Return'} requested`);
      setShowReturn(false);
      setReason('');
      load();
    } catch (e2) {
      toast.error(e2.message || 'Failed to submit request');
    } finally { setActing(false); }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center">Loading order...</div>;
  if (!order) return <div className="text-center py-20">Order not found</div>;

  const isAdmin = user?.role === 'ADMIN';
  const canCancel = ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status);
  const canReturn = order.status === 'DELIVERED';
  const openReturn = (order.returnRequests || []).find((r) => ['REQUESTED', 'APPROVED'].includes(r.status));
  const latestReturn = (order.returnRequests || [])[0];
  const isRefunded = order.payment?.status === 'REFUNDED' || order.status === 'REFUNDED';

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
          {!isAdmin && (canCancel || canReturn || latestReturn || isRefunded) && (
            <div className="mb-8 rounded-xl border border-border p-5">
              <div className="flex flex-wrap items-center gap-3">
                {canCancel && (
                  <button onClick={handleCancel} disabled={acting} data-testid="cancel-order-btn" className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                    <XCircle size={15} /> Cancel Order
                  </button>
                )}
                {canReturn && !openReturn && (
                  <button onClick={() => setShowReturn((v) => !v)} data-testid="return-order-btn" className="inline-flex items-center gap-2 rounded-lg border border-foreground px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-foreground hover:text-white">
                    <RotateCcw size={15} /> Return / Exchange
                  </button>
                )}
                {isRefunded && (
                  <span data-testid="refund-badge" className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-green-700">
                    <CheckCircle2 size={15} /> Refund Processed
                  </span>
                )}
              </div>

              {latestReturn && (
                <div data-testid="return-status" className="mt-4 rounded-lg bg-muted/50 p-4 text-sm">
                  <p className="font-medium text-foreground">{latestReturn.type === 'EXCHANGE' ? 'Exchange' : 'Return'} request — <span className="uppercase">{latestReturn.status}</span></p>
                  <p className="text-muted-foreground mt-1">Reason: {latestReturn.reason}</p>
                  {latestReturn.refundAmount && <p className="text-green-700 mt-1">Refund: ₹{parseFloat(latestReturn.refundAmount).toFixed(2)}</p>}
                  {latestReturn.adminNote && <p className="text-muted-foreground mt-1 italic">Note: {latestReturn.adminNote}</p>}
                </div>
              )}

              {showReturn && (
                <form onSubmit={handleReturn} data-testid="return-form" className="mt-4 space-y-3 border-t border-border pt-4">
                  <div className="flex gap-3">
                    {['RETURN', 'EXCHANGE'].map((t) => (
                      <button key={t} type="button" onClick={() => setReturnType(t)} className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold uppercase ${returnType === t ? 'border-foreground bg-foreground text-white' : 'border-border'}`}>
                        {t === 'RETURN' ? 'Return' : 'Exchange'}
                      </button>
                    ))}
                  </div>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} data-testid="return-reason" placeholder="Tell us why…" rows={3} className="w-full rounded-lg border border-border bg-transparent p-3 text-sm focus:border-foreground focus:ring-0" />
                  <button type="submit" disabled={acting} data-testid="return-submit" className="w-full rounded-lg bg-foreground py-3 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50">
                    {acting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-foreground mb-4">Items Ordered</h3>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                    <img src={item.image} className="w-16 h-16 object-cover rounded-lg bg-muted" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity} x ₹{parseFloat(item.price).toFixed(2)}</p>
                    </div>
                    <p className="font-medium text-foreground">₹{parseFloat(item.subtotal).toFixed(2)}</p>
                  </div>
                ))}
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
    </div>
  );
}
