import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag, AlertTriangle, Download, Package, Repeat, Percent } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

const inr = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GrowthBadge = ({ value }) => {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${up ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(value).toFixed(1)}%
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color, growth, sub, testId }) => (
  <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-5" data-testid={testId}>
    <div className="flex items-start justify-between">
      <div className={`inline-flex p-2.5 rounded-lg ${color} mb-3`}><Icon size={18} /></div>
      {growth !== undefined && <GrowthBadge value={growth} />}
    </div>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
  </div>
);

const CardSkeleton = ({ h = 'h-28' }) => <div className={`animate-pulse rounded-xl bg-gray-200/70 dark:bg-gray-700/50 ${h}`} />;

const Panel = ({ title, right, children, testId }) => (
  <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-6" data-testid={testId}>
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-display font-bold">{title}</h2>
      {right}
    </div>
    {children}
  </div>
);

const STATUS_COLORS = {
  DELIVERED: 'bg-green-100 text-green-700', SHIPPED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-indigo-100 text-indigo-700', PROCESSING: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-gray-100 text-gray-600', CANCELLED: 'bg-red-100 text-red-700', REFUNDED: 'bg-purple-100 text-purple-700',
};

export default function AdminAnalytics() {
  const [range, setRange] = useState(30);
  const [granularity, setGranularity] = useState('daily');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/analytics/dashboard?range=${range}&granularity=${granularity}`)
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [range, granularity]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/orders/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Orders exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.revenueSeries.map((d, i) => ({ ...d, prevRevenue: data.prevRevenueSeries[i]?.revenue ?? 0 }));
  }, [data]);

  const heatMax = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.heatmap.flat());
  }, [data]);

  const k = data?.kpis;

  return (
    <div data-testid="admin-analytics">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Revenue, orders, customers and inventory insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden" data-testid="analytics-granularity">
            {['daily', 'weekly', 'monthly'].map((g) => (
              <button key={g} onClick={() => setGranularity(g)} data-testid={`granularity-${g}`}
                className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${granularity === g ? 'bg-foreground text-white' : 'text-muted-foreground hover:bg-muted'}`}>
                {g}
              </button>
            ))}
          </div>
          <select data-testid="analytics-range" value={range} onChange={(e) => setRange(parseInt(e.target.value))}
            className="px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-foreground outline-none">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button data-testid="export-orders-btn" onClick={exportCsv} disabled={exporting}
            className="flex items-center gap-2 bg-foreground text-white px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity rounded-lg">
            <Download size={16} /> {exporting ? 'Exporting…' : 'Export Orders (CSV)'}
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}</div>
          <CardSkeleton h="h-80" />
          <div className="grid lg:grid-cols-2 gap-6"><CardSkeleton h="h-64" /><CardSkeleton h="h-64" /></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label={`Revenue (${range}d)`} value={inr(k.revenue)} growth={k.growth.revenue} sub={`prev: ${inr(k.previous.revenue)}`} color="bg-green-100 text-green-700" testId="kpi-revenue" />
            <StatCard icon={ShoppingBag} label={`Orders (${range}d)`} value={k.orders} growth={k.growth.orders} sub={`prev: ${k.previous.orders}`} color="bg-blue-100 text-blue-700" testId="kpi-orders" />
            <StatCard icon={TrendingUp} label="Avg Order Value" value={inr(k.aov)} growth={k.growth.aov} color="bg-amber-100 text-amber-700" testId="kpi-aov" />
            <StatCard icon={Users} label="Customers" value={k.totalCustomers} growth={k.growth.customers} sub={`${k.newCustomers} new in period`} color="bg-purple-100 text-purple-700" testId="kpi-customers" />
          </div>
          {/* KPI row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Percent} label="Conversion" value={`${k.conversion.toFixed(1)}%`} sub="customers who purchased" color="bg-teal-100 text-teal-700" testId="kpi-conversion" />
            <StatCard icon={Repeat} label="Returning Customers" value={k.returningCustomers} sub={`${k.returningRate.toFixed(1)}% repeat rate`} color="bg-pink-100 text-pink-700" testId="kpi-returning" />
            <StatCard icon={Package} label="Active Products" value={k.totalProducts} color="bg-indigo-100 text-indigo-700" testId="kpi-products" />
            <StatCard icon={AlertTriangle} label="Low Stock Items" value={data.lowStock.count} sub={`${data.lowStock.outOfStock} out of stock`} color="bg-red-100 text-red-700" testId="kpi-lowstock" />
          </div>

          {/* Revenue chart with previous-period comparison */}
          <Panel title={`Revenue — ${granularity} (vs previous period)`} testId="sales-chart">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#111111" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#111111" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                  <XAxis dataKey="key" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} width={44} />
                  <Tooltip formatter={(v, name) => [inr(v), name === 'prevRevenue' ? 'Previous period' : 'Revenue']} labelStyle={{ fontWeight: 600 }} />
                  <Legend formatter={(v) => (v === 'prevRevenue' ? 'Previous period' : 'Revenue')} />
                  <Area type="monotone" dataKey="revenue" stroke="#111111" strokeWidth={2} fill="url(#rev)" />
                  <Area type="monotone" dataKey="prevRevenue" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 4" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Orders bar chart */}
            <Panel title="Orders" testId="orders-chart">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                    <XAxis dataKey="key" tick={{ fontSize: 11 }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#111111" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* Customer growth line */}
            <Panel title="Customer Growth" testId="customer-growth-chart">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                    <XAxis dataKey="key" tick={{ fontSize: 11 }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
                    <Tooltip formatter={(v) => [v, 'New customers']} />
                    <Line type="monotone" dataKey="customers" stroke="#7c3aed" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          {/* Sales heatmap */}
          <Panel title="Sales Heatmap (orders by day & hour)" testId="sales-heatmap">
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {data.heatmap.map((row, d) => (
                  <div key={d} className="flex items-center gap-1 mb-1">
                    <span className="w-9 text-[10px] font-semibold text-muted-foreground">{DAYS[d]}</span>
                    {row.map((v, h) => (
                      <div key={h} title={`${DAYS[d]} ${h}:00 — ${v} orders`}
                        className="h-5 flex-1 rounded-[3px]"
                        style={{ backgroundColor: v ? `rgba(17,17,17,${0.15 + 0.85 * (v / heatMax)})` : 'rgba(120,120,120,0.08)' }} />
                    ))}
                  </div>
                ))}
                <div className="flex items-center gap-1 mt-1 pl-10 text-[9px] text-muted-foreground">
                  {[...Array(24)].map((_, h) => <span key={h} className="flex-1 text-center">{h % 4 === 0 ? `${h}h` : ''}</span>)}
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top products */}
            <Panel title="Top Selling Products" testId="top-products">
              <div className="space-y-1">
                {data.topProducts.length ? data.topProducts.map((prod, i) => (
                  <div key={prod.productId} className="flex items-center gap-3 text-sm py-2 border-b border-border last:border-0">
                    <span className="w-5 text-muted-foreground font-bold">{i + 1}</span>
                    {prod.image && <img src={prod.image} alt="" className="w-9 h-9 rounded-lg object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{prod.name}</p>
                      <p className="text-xs text-muted-foreground">{prod.category} · {prod.units} sold</p>
                    </div>
                    <span className="font-bold">{inr(prod.revenue)}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No sales in this period</p>}
              </div>
            </Panel>

            {/* Best categories */}
            <Panel title="Best Categories" testId="best-categories">
              <div className="space-y-3">
                {data.bestCategories.length ? data.bestCategories.map((c) => {
                  const max = data.bestCategories[0]?.revenue || 1;
                  return (
                    <div key={c.category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{c.category}</span>
                        <span className="font-bold">{inr(c.revenue)} <span className="text-xs font-normal text-muted-foreground">({c.units} units)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${(c.revenue / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                }) : <p className="text-sm text-muted-foreground">No category sales in this period</p>}
              </div>
            </Panel>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent orders */}
            <Panel title="Recent Orders" testId="recent-orders">
              <div className="space-y-1">
                {data.recentOrders.length ? data.recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 text-sm py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{o.customer} · {new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                    <span className="font-bold w-20 text-right">{inr(o.total)}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No orders yet</p>}
              </div>
            </Panel>

            {/* Low stock */}
            <Panel title="Low Stock Products" right={<span className="text-xs text-muted-foreground">{data.lowStock.count} items · {data.lowStock.outOfStock} out of stock</span>} testId="low-stock-panel">
              <div className="space-y-1">
                {data.lowStock.items.length ? data.lowStock.items.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 text-sm py-2 border-b border-border last:border-0">
                    <img src={i.product?.images?.[0]?.url || 'https://via.placeholder.com/40'} alt="" className="w-9 h-9 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{i.product?.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {i.product?.sku} · threshold {i.threshold}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${i.quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{i.quantity}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">All products are well stocked 🎉</p>}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
