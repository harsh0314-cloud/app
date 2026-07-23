import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Users, ShoppingBag, AlertTriangle, Download, UserPlus } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const inr = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-5">
    <div className={`inline-flex p-2.5 rounded-lg ${color} mb-3`}><Icon size={20} /></div>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
  </div>
);

export default function AdminAnalytics() {
  const [range, setRange] = useState(30);
  const [sales, setSales] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/admin/analytics/sales?range=${range}`),
      api.get('/admin/analytics/revenue'),
      api.get('/admin/analytics/customers'),
      api.get('/admin/inventory/low-stock'),
    ])
      .then(([s, r, c, l]) => {
        setSales(s.data); setRevenue(r.data); setCustomers(c.data); setLowStock(l.data);
      })
      .catch((e) => toast.error(e.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [range]);

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
    } catch (e) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const maxRev = sales?.series?.reduce((m, d) => Math.max(m, d.revenue), 0) || 1;

  return (
    <div data-testid="admin-analytics">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Sales, revenue and customer insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            data-testid="analytics-range"
            value={range}
            onChange={(e) => setRange(parseInt(e.target.value))}
            className="px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-foreground outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button
            data-testid="export-orders-btn"
            onClick={exportCsv}
            disabled={exporting}
            className="flex items-center gap-2 bg-foreground text-white px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity rounded-lg"
          >
            <Download size={16} /> {exporting ? 'Exporting...' : 'Export Orders (CSV)'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading analytics...</div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label={`Revenue (${range}d)`} value={inr(sales?.summary?.totalRevenue)} color="bg-green-100 text-green-700" />
            <StatCard icon={ShoppingBag} label={`Orders (${range}d)`} value={sales?.summary?.totalOrders ?? 0} color="bg-blue-100 text-blue-700" />
            <StatCard icon={TrendingUp} label="Avg Order Value" value={inr(sales?.summary?.averageOrderValue)} color="bg-amber-100 text-amber-700" />
            <StatCard icon={Users} label="Total Customers" value={customers?.totalCustomers ?? 0} color="bg-purple-100 text-purple-700" />
          </div>

          {/* Sales trend bar chart (CSS-based, no chart dependency) */}
          <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-6">
            <h2 className="font-display font-bold mb-6">Revenue Trend</h2>
            <div className="flex items-end gap-1 h-48" data-testid="sales-chart">
              {sales?.series?.map((d) => (
                <div key={d.date} className="flex-1 group relative flex flex-col justify-end items-center">
                  <div
                    className="w-full bg-foreground/80 hover:bg-foreground transition-colors rounded-t"
                    style={{ height: `${Math.max(2, (d.revenue / maxRev) * 100)}%` }}
                    title={`${d.date}: ${inr(d.revenue)} (${d.orders} orders)`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
              <span>{sales?.series?.[0]?.date}</span>
              <span>{sales?.series?.[sales.series.length - 1]?.date}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by status */}
            <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-6">
              <h2 className="font-display font-bold mb-4">Revenue by Order Status</h2>
              <div className="space-y-2">
                {revenue?.byStatus?.length ? revenue.byStatus.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                    <span className="font-medium">{s.status} <span className="text-muted-foreground">({s.count})</span></span>
                    <span className="font-bold">{inr(s.revenue)}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No data</p>}
                <div className="flex items-center justify-between text-sm pt-3 mt-2 border-t border-foreground/20">
                  <span className="font-semibold">Paid Revenue</span>
                  <span className="font-bold text-green-600">{inr(revenue?.paidRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Top customers */}
            <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold">Top Customers</h2>
                <span className="inline-flex items-center gap-1 text-xs text-green-600"><UserPlus size={13} /> {customers?.newCustomers ?? 0} new (30d)</span>
              </div>
              <div className="space-y-2">
                {customers?.topCustomers?.length ? customers.topCustomers.slice(0, 6).map((c, i) => (
                  <div key={c.userId} className="flex items-center gap-3 text-sm py-2 border-b border-border last:border-0">
                    <span className="w-6 text-muted-foreground font-bold">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{inr(c.totalSpent)}</p>
                      <p className="text-xs text-muted-foreground">{c.orders} orders</p>
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No customer orders yet</p>}
              </div>
            </div>
          </div>

          {/* Low stock alerts */}
          <div className="bg-white dark:bg-gray-800 border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-amber-500" />
              <h2 className="font-display font-bold">Low Stock Alerts</h2>
              <span className="text-xs text-muted-foreground">({lowStock?.count ?? 0} items, {lowStock?.outOfStock ?? 0} out of stock)</span>
            </div>
            {lowStock?.lowStock?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStock.lowStock.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 border border-border rounded-lg p-3">
                    <img src={i.product?.images?.[0]?.url || 'https://via.placeholder.com/48'} alt="" className="w-10 h-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{i.product?.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {i.product?.sku}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${i.quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{i.quantity}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">All products are well stocked. 🎉</p>}
          </div>
        </div>
      )}
    </div>
  );
}
