import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, Filter, Truck, CheckCircle2, XCircle, Clock, ClipboardList, ArrowRight, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Human labels for statuses. "Placed" is the UI name for the PENDING enum value.
const STATUS_LABEL = {
  PENDING:    'Placed',
  CONFIRMED:  'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED:    'Shipped',
  DELIVERED:  'Delivered',
  CANCELLED:  'Cancelled',
  REFUNDED:   'Refunded',
};

const STATUS_BADGE = {
  PENDING:    'bg-amber-100 text-amber-800',
  CONFIRMED:  'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  SHIPPED:    'bg-violet-100 text-violet-800',
  DELIVERED:  'bg-emerald-100 text-emerald-800',
  CANCELLED:  'bg-red-100 text-red-800',
  REFUNDED:   'bg-gray-100 text-gray-700',
};

// Mirrors ORDER_STATUS_TRANSITIONS in server/src/controllers/adminController.js.
// UI intentionally hides REFUNDED — that state is only set by the Returns module.
const NEXT_STATUSES = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED'],
  DELIVERED:  [],
  CANCELLED:  [],
  REFUNDED:   [],
};

const ALL_STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const paymentBadge = (order) => {
  if (order.status === 'REFUNDED') return { label: 'Refunded', cls: 'bg-gray-100 text-gray-700' };
  if (order.paymentMethod === 'RAZORPAY') return { label: 'Paid (Online)', cls: 'bg-emerald-100 text-emerald-800' };
  if (order.status === 'DELIVERED') return { label: 'Paid (COD)', cls: 'bg-emerald-100 text-emerald-800' };
  return { label: 'Cash on Delivery', cls: 'bg-yellow-100 text-yellow-800' };
};

function StatCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'bg-white text-gray-900',
    amber:   'bg-amber-50 text-amber-900',
    blue:    'bg-blue-50 text-blue-900',
    violet:  'bg-violet-50 text-violet-900',
    green:   'bg-emerald-50 text-emerald-900',
    red:     'bg-red-50 text-red-900',
  };
  return (
    <div className={`rounded-2xl border border-border p-5 ${tones[tone] || tones.default}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

// Compact horizontal timeline showing where the order sits along the happy path.
function OrderTimeline({ status }) {
  if (status === 'CANCELLED' || status === 'REFUNDED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-700">
        <XCircle size={12}/> {STATUS_LABEL[status] || status}
      </span>
    );
  }
  const idx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1" data-testid="order-mini-timeline">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`h-2 w-2 rounded-full ${i <= idx ? 'bg-foreground' : 'bg-border'}`} title={STATUS_LABEL[s]}/>
          {i < STATUS_STEPS.length - 1 && <div className={`h-0.5 w-4 ${i < idx ? 'bg-foreground' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [pendingUpdates, setPendingUpdates] = useState({}); // { orderId: { status?, trackingNumber? } }
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const load = () => {
    setLoading(true);
    api.get(`/admin/orders?page=${page}&limit=20`)
      .then((res) => {
        setOrders(res.data.orders || []);
        setPagination(res.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });
      })
      .catch((e) => toast.error(e.message || 'Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== 'ALL') list = list.filter((o) => o.status === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((o) =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.user?.email || '').toLowerCase().includes(q) ||
        `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.toLowerCase().includes(q) ||
        (o.items || []).some((it) => (it.name || '').toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, statusFilter, query]);

  const stats = useMemo(() => {
    const s = { total: orders.length, placed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    for (const o of orders) {
      if (o.status === 'PENDING') s.placed++;
      else if (o.status === 'CONFIRMED' || o.status === 'PROCESSING') s.processing++;
      else if (o.status === 'SHIPPED') s.shipped++;
      else if (o.status === 'DELIVERED') s.delivered++;
      else if (o.status === 'CANCELLED') s.cancelled++;
    }
    return s;
  }, [orders]);

  const applyStatus = async (order, nextStatus) => {
    if (!NEXT_STATUSES[order.status]?.includes(nextStatus)) {
      toast.error('That transition is not allowed.');
      return;
    }
    // For SHIPPED, require a tracking number entered by the admin.
    let trackingNumber = pendingUpdates[order.id]?.trackingNumber || order.trackingNumber || '';
    if (nextStatus === 'SHIPPED' && !trackingNumber.trim()) {
      const val = window.prompt('Enter tracking number for this shipment:');
      if (!val || !val.trim()) return;
      trackingNumber = val.trim();
    }
    setBusyId(order.id);
    try {
      await api.patch(`/admin/orders/${order.id}/status`, { status: nextStatus, trackingNumber: trackingNumber || undefined });
      toast.success(`Order marked ${STATUS_LABEL[nextStatus]}`);
      setPendingUpdates((p) => { const n = { ...p }; delete n[order.id]; return n; });
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const setTrackingDraft = (orderId, trackingNumber) => {
    setPendingUpdates((p) => ({ ...p, [orderId]: { ...p[orderId], trackingNumber } }));
  };

  return (
    <div className="space-y-6" data-testid="admin-orders-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3"><ClipboardList size={22}/> Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage every order — update status, track shipments, and drill in for details.</p>
        </div>
        <button onClick={load} data-testid="admin-orders-refresh" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors">
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="admin-orders-stats">
        <StatCard label="Total" value={pagination.total ?? stats.total} />
        <StatCard label="Placed" value={stats.placed} tone="amber"/>
        <StatCard label="In Progress" value={stats.processing} tone="blue"/>
        <StatCard label="Shipped" value={stats.shipped} tone="violet"/>
        <StatCard label="Delivered" value={stats.delivered} tone="green"/>
        <StatCard label="Cancelled" value={stats.cancelled} tone="red"/>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search by order #, customer, email, product…" data-testid="admin-orders-search" className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-foreground outline-none"/>
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="admin-orders-status-filter" className="pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-foreground outline-none bg-white min-w-[13rem]">
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : (STATUS_LABEL[s] || s)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <Package size={24} className="mx-auto mb-3 opacity-50"/>
          <p>No orders match your filters.</p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Order</th>
                <th className="text-left px-4 py-3 font-semibold">Customer</th>
                <th className="text-left px-4 py-3 font-semibold">Payment</th>
                <th className="text-left px-4 py-3 font-semibold">Progress</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Total</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const nexts = NEXT_STATUSES[order.status] || [];
                const pay = paymentBadge(order);
                return (
                  <tr key={order.id} data-testid={`admin-order-row-${order.id}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{order.orderNumber}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      <p className="text-[11px] text-muted-foreground">{(order.items || []).length} item(s)</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{order.user?.firstName} {order.user?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{order.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${pay.cls}`}>{pay.label}</span>
                    </td>
                    <td className="px-4 py-3"><OrderTimeline status={order.status}/></td>
                    <td className="px-4 py-3">
                      <span data-testid={`admin-order-status-${order.id}`} className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-700'}`}>{STATUS_LABEL[order.status] || order.status}</span>
                      {order.trackingNumber && <p className="text-[11px] text-muted-foreground mt-1">Trk: <span className="text-foreground">{order.trackingNumber}</span></p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">₹{parseFloat(order.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-2">
                        {nexts.length > 0 ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {order.status === 'PROCESSING' && (
                              <input
                                type="text"
                                placeholder="Tracking #"
                                value={pendingUpdates[order.id]?.trackingNumber ?? order.trackingNumber ?? ''}
                                onChange={(e) => setTrackingDraft(order.id, e.target.value)}
                                data-testid={`admin-order-tracking-${order.id}`}
                                className="w-28 rounded border border-border px-2 py-1 text-xs"
                              />
                            )}
                            <select
                              value=""
                              disabled={busyId === order.id}
                              onChange={(e) => { const v = e.target.value; if (v) applyStatus(order, v); }}
                              data-testid={`admin-order-status-select-${order.id}`}
                              className="rounded-lg border border-border px-3 py-2 text-xs bg-white disabled:opacity-60"
                            >
                              <option value="" disabled>{busyId === order.id ? 'Updating…' : 'Move to…'}</option>
                              {nexts.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                            </select>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Terminal</span>
                        )}
                        <Link to={`/orders/${order.id}`} data-testid={`admin-order-view-${order.id}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground hover:underline">
                          View <ArrowRight size={11}/>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} orders</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-muted transition-colors" data-testid="admin-orders-prev-page">Previous</button>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-muted transition-colors" data-testid="admin-orders-next-page">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
