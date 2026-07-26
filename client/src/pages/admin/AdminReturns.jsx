import { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Search, Filter, Image as ImageIcon, CalendarClock, CheckCircle2, XCircle, Truck, Wallet, Ticket, CreditCard, Package, X, ExternalLink, Clock } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { STATUS_LABEL, STATUS_BADGE } from '../../lib/returnStatus';

const STATUSES = ['ALL', 'PENDING', 'APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'REFUND_PROCESSED', 'EXCHANGE_SHIPPED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

const REFUND_METHOD_LABEL = { ORIGINAL: 'Original Payment', WALLET: 'Wallet', STORE_CREDIT: 'Store Credit' };
const REFUND_METHOD_ICON = { ORIGINAL: CreditCard, WALLET: Wallet, STORE_CREDIT: Ticket };

function StatCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'bg-white text-gray-900',
    amber: 'bg-amber-50 text-amber-900',
    blue: 'bg-blue-50 text-blue-900',
    green: 'bg-emerald-50 text-emerald-900',
    red: 'bg-red-50 text-red-900',
    violet: 'bg-violet-50 text-violet-900',
  };
  return (
    <div className={`rounded-2xl border border-border p-5 ${tones[tone] || tones.default}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function ReturnDrawer({ request, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [adminNote, setAdminNote] = useState(request.adminNote || '');
  const [refundAmount, setRefundAmount] = useState(request.refundAmount || '');
  const [refundMethod, setRefundMethod] = useState(request.refundMethod || 'ORIGINAL');
  const [pickupAt, setPickupAt] = useState(request.pickupScheduledAt ? new Date(request.pickupScheduledAt).toISOString().slice(0, 16) : '');
  const [tracking, setTracking] = useState(request.exchangeTrackingNumber || '');
  const [previewImg, setPreviewImg] = useState(null);

  const doUpdate = async (payload) => {
    setBusy(true);
    try {
      await api.patch(`/admin/returns/${request.id}`, payload);
      toast.success('Request updated');
      onChanged?.();
    } catch (e) {
      toast.error(e.message || 'Update failed');
    } finally { setBusy(false); }
  };

  const nextActions = () => {
    const s = request.status;
    if (s === 'PENDING') {
      return (
        <>
          <button data-testid="drawer-approve" disabled={busy} onClick={() => doUpdate({ status: 'APPROVED', adminNote })} className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
            <CheckCircle2 size={14} className="inline mr-1"/> Approve
          </button>
          <button data-testid="drawer-reject" disabled={busy} onClick={() => doUpdate({ status: 'REJECTED', adminNote })} className="rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
            <XCircle size={14} className="inline mr-1"/> Reject
          </button>
        </>
      );
    }
    if (s === 'APPROVED') {
      return (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted-foreground">
            <span className="block mb-1">Pickup date &amp; time</span>
            <input type="datetime-local" value={pickupAt} onChange={(e) => setPickupAt(e.target.value)} data-testid="drawer-pickup-at" className="rounded-lg border border-border px-3 py-2 text-sm bg-white"/>
          </label>
          <button data-testid="drawer-schedule-pickup" disabled={busy || !pickupAt} onClick={() => doUpdate({ status: 'PICKUP_SCHEDULED', pickupScheduledAt: new Date(pickupAt).toISOString(), adminNote })} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
            <CalendarClock size={14} className="inline mr-1"/> Schedule pickup
          </button>
        </div>
      );
    }
    if (s === 'PICKUP_SCHEDULED') {
      return (
        <button data-testid="drawer-mark-picked" disabled={busy} onClick={() => doUpdate({ status: 'PICKED_UP', adminNote })} className="rounded-lg bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
          <Truck size={14} className="inline mr-1"/> Mark picked up
        </button>
      );
    }
    if (s === 'PICKED_UP') {
      if (request.type === 'RETURN') {
        return (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Refund amount (₹)</span>
              <input type="number" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} data-testid="drawer-refund-amount" className="rounded-lg border border-border px-3 py-2 text-sm bg-white w-32"/>
            </label>
            <label className="text-xs text-muted-foreground">
              <span className="block mb-1">Method</span>
              <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} data-testid="drawer-refund-method" className="rounded-lg border border-border px-3 py-2 text-sm bg-white">
                <option value="ORIGINAL">Original payment (Razorpay)</option>
                <option value="WALLET">Store wallet</option>
                <option value="STORE_CREDIT">Store credit coupon</option>
              </select>
            </label>
            <button data-testid="drawer-process-refund" disabled={busy || !refundAmount} onClick={() => doUpdate({ status: 'REFUND_PROCESSED', refundAmount, refundMethod, adminNote })} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
              <Wallet size={14} className="inline mr-1"/> Process refund
            </button>
          </div>
        );
      }
      return (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted-foreground">
            <span className="block mb-1">Tracking number</span>
            <input type="text" value={tracking} onChange={(e) => setTracking(e.target.value)} data-testid="drawer-tracking" className="rounded-lg border border-border px-3 py-2 text-sm bg-white"/>
          </label>
          <button data-testid="drawer-ship-exchange" disabled={busy || !tracking} onClick={() => doUpdate({ status: 'EXCHANGE_SHIPPED', exchangeTrackingNumber: tracking, adminNote })} className="rounded-lg bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
            <Truck size={14} className="inline mr-1"/> Ship exchange
          </button>
        </div>
      );
    }
    if (s === 'REFUND_PROCESSED' || s === 'EXCHANGE_SHIPPED') {
      return (
        <button data-testid="drawer-complete" disabled={busy} onClick={() => doUpdate({ status: 'COMPLETED', adminNote })} className="rounded-lg bg-green-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
          <CheckCircle2 size={14} className="inline mr-1"/> Complete request
        </button>
      );
    }
    return <p className="text-xs text-muted-foreground">This request is closed.</p>;
  };

  return (
    <div className="fixed inset-0 z-40 flex" data-testid="admin-return-drawer">
      <div className="flex-1 bg-black/40" onClick={onClose}/>
      <aside className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{request.type} · Request</p>
            <p className="font-bold text-foreground">{request.order?.orderNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_BADGE[request.status] || 'bg-gray-100 text-gray-700'}`}>{STATUS_LABEL[request.status] || request.status}</span>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg" data-testid="drawer-close"><X size={16}/></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Customer</p>
            <p className="text-sm text-foreground">{request.user?.firstName} {request.user?.lastName}</p>
            <p className="text-xs text-muted-foreground">{request.user?.email}</p>
          </section>

          {/* Items */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Items requested</p>
            <div className="space-y-2">
              {(request.items || []).map((it) => (
                <div key={it.id} className="flex items-center gap-3 border border-border rounded-lg p-3" data-testid={`drawer-item-${it.id}`}>
                  <img src={it.orderItem?.image} alt="" className="w-12 h-12 rounded-md object-cover bg-muted"/>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{it.orderItem?.name}</p>
                    <p className="text-xs text-muted-foreground">Qty {it.quantity}{it.orderItem?.size ? ` · Size ${it.orderItem.size}` : ''}{it.exchangeSize ? ` → New size ${it.exchangeSize}` : ''}</p>
                  </div>
                  <p className="text-xs font-semibold">₹{(parseFloat(it.orderItem?.price || 0) * it.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Reason */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Reason</p>
            <p className="text-sm text-foreground">{request.reason}</p>
            {request.comments && <p className="text-sm text-muted-foreground mt-1 italic">"{request.comments}"</p>}
          </section>

          {/* Photos */}
          {(request.images || []).length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2"><ImageIcon size={14}/> Proof photos</p>
              <div className="grid grid-cols-4 gap-2">
                {request.images.map((img, i) => (
                  <button key={img.id} type="button" onClick={() => setPreviewImg(img.url)} data-testid={`drawer-image-${i}`} className="aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={img.url} alt="" className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Refund block */}
          {request.type === 'RETURN' && (request.refundMethod || request.refundAmount) && (
            <section className="rounded-lg border border-border p-4 bg-muted/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Refund</p>
              <div className="flex items-center gap-3">
                {(() => { const Icon = REFUND_METHOD_ICON[request.refundMethod] || Wallet; return <Icon size={16}/>; })()}
                <p className="text-sm">
                  ₹{parseFloat(request.refundAmount || 0).toFixed(2)}
                  {request.refundMethod ? ` · ${REFUND_METHOD_LABEL[request.refundMethod]}` : ''}
                  {request.refundStatus === 'PROCESSED' && request.refundedAt ? ` · Processed ${new Date(request.refundedAt).toLocaleDateString('en-IN')}` : ''}
                </p>
              </div>
              {request.storeCreditCouponCode && <p className="text-xs text-muted-foreground mt-1">Coupon: <span className="font-medium text-foreground">{request.storeCreditCouponCode}</span></p>}
              {request.refundTransactionId && <p className="text-xs text-muted-foreground mt-1">Razorpay refund id: <span className="font-medium text-foreground">{request.refundTransactionId}</span></p>}
            </section>
          )}

          {/* Timeline */}
          {(request.history || []).length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Activity</p>
              <ol className="space-y-3">
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
            </section>
          )}

          {/* Internal note */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Internal note (visible in email if provided)</p>
            <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} data-testid="drawer-admin-note" rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm" placeholder="Add a note for the customer or team…"/>
          </section>

          {/* Actions */}
          <section className="border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Actions</p>
            <div className="flex flex-wrap items-end gap-3">{nextActions()}</div>
          </section>
        </div>

        {previewImg && (
          <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-6" onClick={() => setPreviewImg(null)}>
            <img src={previewImg} alt="" className="max-h-[85vh] max-w-full object-contain rounded-xl"/>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (debounced) params.set('q', debounced);
    Promise.all([
      api.get(`/admin/returns?${params.toString()}`),
      api.get('/admin/returns/stats'),
    ])
      .then(([listRes, statsRes]) => {
        setReturns(listRes.data.returns || []);
        setStats(statsRes.data.stats || null);
      })
      .catch(() => toast.error('Failed to load returns'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, debounced]);

  const totalRefunded = useMemo(() => stats?.totalRefundedAmount ? `₹${parseFloat(stats.totalRefundedAmount).toFixed(0)}` : '₹0', [stats]);

  return (
    <div className="space-y-6" data-testid="admin-returns-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3"><RotateCcw size={22}/> Returns &amp; Exchanges</h1>
          <p className="text-sm text-muted-foreground mt-1">Process returns, schedule pickups, issue refunds and ship exchanges.</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="admin-returns-stats">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pending" value={stats.pending} tone="amber"/>
          <StatCard label="In Progress" value={stats.approved} tone="blue"/>
          <StatCard label="Completed" value={stats.completed} tone="green"/>
          <StatCard label="Rejected" value={stats.rejected} tone="red"/>
          <StatCard label="Refunded" value={totalRefunded} tone="violet"/>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search by order #, customer, product…" data-testid="admin-returns-search" className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-foreground outline-none"/>
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="admin-returns-status-filter" className="pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-foreground outline-none bg-white min-w-[13rem]">
            {STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : (STATUS_LABEL[s] || s)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading returns…</div>
      ) : returns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <RotateCcw size={24} className="mx-auto mb-3 opacity-50"/>
          <p>No return or exchange requests match your filters.</p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Request</th>
                <th className="text-left px-4 py-3 font-semibold">Customer</th>
                <th className="text-left px-4 py-3 font-semibold">Items</th>
                <th className="text-left px-4 py-3 font-semibold">Reason</th>
                <th className="text-left px-4 py-3 font-semibold">Refund</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} data-testid={`admin-return-row-${r.id}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{r.order?.orderNumber}</p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.type}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.user?.firstName} {r.user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{r.user?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex -space-x-2">
                      {(r.items || []).slice(0, 3).map((it) => (
                        <img key={it.id} src={it.orderItem?.image} alt="" className="w-8 h-8 rounded-md object-cover border-2 border-white bg-muted"/>
                      ))}
                      {(r.items || []).length > 3 && (
                        <div className="w-8 h-8 rounded-md bg-muted border-2 border-white flex items-center justify-center text-[10px] font-semibold">+{r.items.length - 3}</div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{r.items?.length || 0} item(s)</p>
                  </td>
                  <td className="px-4 py-3 max-w-[16rem]"><p className="text-xs text-foreground line-clamp-2">{r.reason}</p></td>
                  <td className="px-4 py-3">
                    {r.refundAmount ? (
                      <div>
                        <p className="text-sm font-semibold">₹{parseFloat(r.refundAmount).toFixed(2)}</p>
                        <p className="text-[11px] text-muted-foreground">{r.refundMethod ? REFUND_METHOD_LABEL[r.refundMethod] : '—'}</p>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(r)} data-testid={`open-return-${r.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline">
                      Review <ExternalLink size={12}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ReturnDrawer request={selected} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); load(); }} />
      )}
    </div>
  );
}
