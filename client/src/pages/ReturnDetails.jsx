import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle, Clock, Truck, Package, Home, Wallet, Ticket, CreditCard, Info } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { STATUS_LABEL, STATUS_BADGE, timelineForType } from '../lib/returnStatus';

const STEP_ICON = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  PICKUP_SCHEDULED: Package,
  PICKED_UP: Truck,
  REFUND_PROCESSED: Wallet,
  EXCHANGE_SHIPPED: Truck,
  COMPLETED: Home,
};

function Timeline({ request }) {
  const steps = timelineForType(request.type);
  const completedIdx = (() => {
    if (request.status === 'REJECTED' || request.status === 'CANCELLED') return -1;
    if (request.status === 'COMPLETED') return steps.length - 1;
    return steps.indexOf(request.status);
  })();
  if (request.status === 'REJECTED') {
    return (
      <div data-testid="return-timeline" className="mb-8 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <XCircle size={20}/>
        <div>
          <p className="font-medium text-sm">Request rejected</p>
          {request.adminNote && <p className="text-xs opacity-80 mt-0.5">{request.adminNote}</p>}
        </div>
      </div>
    );
  }
  if (request.status === 'CANCELLED') {
    return (
      <div data-testid="return-timeline" className="mb-8 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-700">
        <XCircle size={20}/>
        <p className="font-medium text-sm">This request was cancelled.</p>
      </div>
    );
  }

  return (
    <div data-testid="return-timeline" className="mb-8">
      <div className="grid grid-cols-6 gap-2 sm:gap-4">
        {steps.map((s, i) => {
          const Icon = STEP_ICON[s] || Clock;
          const done = i <= completedIdx;
          return (
            <div key={s} className="flex flex-col items-center relative">
              {i > 0 && (
                <div className={`absolute right-1/2 top-5 h-0.5 w-full ${i <= completedIdx ? 'bg-foreground' : 'bg-border'}`} />
              )}
              <div className={`z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${done ? 'border-foreground bg-foreground text-white' : 'border-border bg-card text-muted-foreground'}`}>
                <Icon size={16}/>
              </div>
              <span className={`mt-2 text-[10px] sm:text-[11px] font-medium text-center leading-tight ${done ? 'text-foreground' : 'text-muted-foreground'}`}>
                {STATUS_LABEL[s]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReturnDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/returns/${id}`)
      .then((res) => setRequest(res.data.request))
      .catch(() => toast.error('Failed to load request'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    if (!window.confirm('Cancel this request? This cannot be undone.')) return;
    setCancelling(true);
    try {
      await api.patch(`/returns/${id}/cancel`);
      toast.success('Request cancelled');
      load();
    } catch (e) { toast.error(e.message || 'Failed to cancel'); }
    finally { setCancelling(false); }
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  if (!request) return <div className="text-center py-20">Not found</div>;

  const refundBadge = {
    ORIGINAL: { icon: CreditCard, label: 'Original Payment' },
    WALLET: { icon: Wallet, label: 'Store Wallet' },
    STORE_CREDIT: { icon: Ticket, label: 'Store Credit' },
  };
  const rm = request.refundMethod ? refundBadge[request.refundMethod] : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <button onClick={() => navigate('/returns')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6" data-testid="return-details-back">
        <ArrowLeft size={16}/> All requests
      </button>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-muted/40 px-6 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-border">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{request.type === 'EXCHANGE' ? 'Exchange' : 'Return'} for</p>
            <p className="font-bold text-foreground text-lg">{request.order?.orderNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Requested {new Date(request.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
          <span data-testid="return-status-badge" className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_BADGE[request.status] || 'bg-gray-100 text-gray-700'}`}>
            {STATUS_LABEL[request.status] || request.status}
          </span>
        </div>

        <div className="p-6">
          <Timeline request={request} />

          {/* Refund block */}
          {request.type === 'RETURN' && request.refundAmount && (
            <div className="rounded-xl border border-border p-4 mb-6 flex items-center gap-3">
              {rm ? <rm.icon size={20}/> : <Wallet size={20}/>}
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Refund of ₹{parseFloat(request.refundAmount).toFixed(2)}{rm ? ` via ${rm.label}` : ''}</p>
                <p className="text-xs text-muted-foreground">
                  {request.refundStatus === 'PROCESSED' ? `Processed on ${new Date(request.refundedAt).toLocaleDateString('en-IN')}` : 'Will be processed once we receive the item'}
                  {request.storeCreditCouponCode && ` · Coupon: ${request.storeCreditCouponCode}`}
                </p>
              </div>
              {request.refundStatus === 'PROCESSED' && <CheckCircle2 size={16} className="text-emerald-600" data-testid="refund-processed-badge"/>}
            </div>
          )}

          {request.type === 'EXCHANGE' && request.exchangeTrackingNumber && (
            <div className="rounded-xl border border-border p-4 mb-6 flex items-center gap-3">
              <Truck size={20}/>
              <div>
                <p className="text-sm font-medium text-foreground">Exchange shipped</p>
                <p className="text-xs text-muted-foreground">Tracking: <span className="font-medium text-foreground">{request.exchangeTrackingNumber}</span></p>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Items</h3>
            <div className="space-y-3">
              {(request.items || []).map((it) => (
                <div key={it.id} className="flex items-center gap-4 border border-border rounded-xl p-3">
                  <img src={it.orderItem?.image} alt="" className="w-14 h-14 rounded-lg object-cover bg-muted"/>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{it.orderItem?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty {it.quantity}{it.orderItem?.size ? ` · Size: ${it.orderItem.size}` : ''}
                      {it.exchangeSize && ` → new size: ${it.exchangeSize}`}
                    </p>
                  </div>
                  {it.orderItem?.price && <p className="text-sm font-semibold text-foreground">₹{(parseFloat(it.orderItem.price) * it.quantity).toFixed(2)}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Photos */}
          {(request.images || []).length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Attached photos</h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {request.images.map((img, i) => (
                  <button key={img.id} type="button" onClick={() => setPreview(img.url)} className="aspect-square rounded-xl overflow-hidden border border-border" data-testid={`return-image-${i}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reason + comments */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Reason</h3>
            <p className="text-sm text-foreground">{request.reason}</p>
            {request.comments && <p className="text-sm text-muted-foreground mt-1">"{request.comments}"</p>}
          </div>

          {/* History */}
          {(request.history || []).length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Activity</h3>
              <ol className="space-y-3" data-testid="return-history">
                {request.history.map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-foreground shrink-0"/>
                    <div>
                      <p className="text-foreground">{STATUS_LABEL[h.status] || h.status}</p>
                      {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                      <p className="text-[11px] text-muted-foreground">{new Date(h.createdAt).toLocaleString('en-IN')}{h.changedByRole ? ` · by ${h.changedByRole.toLowerCase()}` : ''}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-6 border-t border-border">
            <Link to={`/orders/${request.order?.id || request.orderId}`} className="rounded-xl border border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-muted transition-colors">View order</Link>
            {request.status === 'PENDING' && (
              <button onClick={handleCancel} disabled={cancelling} data-testid="return-cancel-btn" className="rounded-xl bg-red-600 text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-50">
                {cancelling ? 'Cancelling…' : 'Cancel request'}
              </button>
            )}
          </div>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setPreview(null)} data-testid="return-image-preview">
          <img src={preview} alt="" className="max-h-[85vh] max-w-full object-contain rounded-xl"/>
        </div>
      )}
    </div>
  );
}
