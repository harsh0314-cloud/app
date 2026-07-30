const { AppError } = require('../utils/AppError');

const toNum = (d) => (d == null ? 0 : parseFloat(d.toString()));
const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

const parseRangeDays = (q) => {
  const n = parseInt(q, 10);
  if ([7, 30, 90, 365].includes(n)) return n;
  return 30;
};

// GET /api/admin/analytics/sales?range=30 — revenue & order count time series
exports.getSalesAnalytics = async (req, res, next) => {
  try {
    const days = parseRangeDays(req.query.range);
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const orders = await req.prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { total: true, createdAt: true, status: true },
    });

    // Seed every day in range with zeros so the chart is continuous
    const buckets = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      buckets[dayKey(d)] = { date: dayKey(d), revenue: 0, orders: 0 };
    }
    orders.forEach((o) => {
      const k = dayKey(o.createdAt);
      if (!buckets[k]) buckets[k] = { date: k, revenue: 0, orders: 0 };
      if (o.status !== 'CANCELLED' && o.status !== 'REFUNDED') buckets[k].revenue += toNum(o.total);
      buckets[k].orders += 1;
    });

    const series = Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
    const totalRevenue = series.reduce((s, d) => s + d.revenue, 0);
    const totalOrders = orders.length;

    res.status(200).json({
      status: 'success',
      data: {
        range: days,
        series,
        summary: {
          totalRevenue,
          totalOrders,
          averageOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/analytics/revenue — revenue breakdown by status & payment
exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const [byStatusRaw, paidAgg, allAgg] = await Promise.all([
      req.prisma.order.groupBy({ by: ['status'], _sum: { total: true }, _count: { _all: true } }),
      req.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true }, _count: { _all: true } }),
      req.prisma.order.aggregate({ _sum: { total: true }, _count: { _all: true } }),
    ]);

    const byStatus = byStatusRaw.map((r) => ({
      status: r.status,
      revenue: toNum(r._sum.total),
      count: r._count._all,
    }));

    res.status(200).json({
      status: 'success',
      data: {
        grossRevenue: toNum(allAgg._sum.total),
        paidRevenue: toNum(paidAgg._sum.amount),
        paidCount: paidAgg._count._all,
        totalOrders: allAgg._count._all,
        byStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/analytics/customers — customer growth & top spenders
exports.getCustomerAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);

    const [totalCustomers, newCustomers, ordersWithUser] = await Promise.all([
      req.prisma.user.count({ where: { role: 'USER' } }),
      req.prisma.user.count({ where: { role: 'USER', createdAt: { gte: monthAgo } } }),
      req.prisma.order.findMany({
        where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        select: { total: true, userId: true, user: { select: { firstName: true, lastName: true, email: true } } },
      }),
    ]);

    const spendMap = {};
    ordersWithUser.forEach((o) => {
      if (!o.userId) return;
      if (!spendMap[o.userId]) {
        spendMap[o.userId] = {
          userId: o.userId,
          name: `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim() || 'Unknown',
          email: o.user?.email || '',
          totalSpent: 0,
          orders: 0,
        };
      }
      spendMap[o.userId].totalSpent += toNum(o.total);
      spendMap[o.userId].orders += 1;
    });
    const topCustomers = Object.values(spendMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    res.status(200).json({
      status: 'success',
      data: { totalCustomers, newCustomers, topCustomers },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/inventory/low-stock — products at or below their low-stock threshold
exports.getLowStockAlerts = async (req, res, next) => {
  try {
    const inventory = await req.prisma.inventory.findMany({
      where: { trackInventory: true },
      include: {
        product: { select: { id: true, name: true, slug: true, sku: true, images: { take: 1, select: { url: true } } } },
      },
      orderBy: { quantity: 'asc' },
    });
    const lowStock = inventory.filter((i) => i.quantity <= (i.lowStockThreshold ?? 10));
    res.status(200).json({
      status: 'success',
      data: {
        lowStock,
        outOfStock: lowStock.filter((i) => i.quantity === 0).length,
        count: lowStock.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

const csvCell = (val) => {
  const s = val == null ? '' : String(val);
  return `"${s.replace(/"/g, '""')}"`;
};

// GET /api/admin/orders/export — download all orders as CSV
exports.exportOrdersCsv = async (req, res, next) => {
  try {
    const orders = await req.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        items: true,
        payment: { select: { status: true, method: true } },
      },
    });

    const header = [
      'Order Number', 'Date', 'Customer', 'Email', 'Status',
      'Payment Method', 'Payment Status', 'Items', 'Subtotal', 'Discount', 'Shipping', 'Tax', 'Total',
    ];
    const rows = orders.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toISOString(),
      `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim(),
      o.user?.email || '',
      o.status,
      o.paymentMethod,
      o.payment?.status || 'N/A',
      o.items.reduce((s, it) => s + it.quantity, 0),
      toNum(o.subtotal),
      toNum(o.discount),
      toNum(o.shippingCost),
      toNum(o.tax),
      toNum(o.total),
    ]);

    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
    const filename = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};


// ─── Enterprise dashboard (single aggregated endpoint) ─────────────────────
const EXCLUDED_STATUSES = ['CANCELLED', 'REFUNDED'];

const bucketKeyFor = (date, granularity) => {
  const d = new Date(date);
  if (granularity === 'monthly') return d.toISOString().slice(0, 7);
  if (granularity === 'weekly') {
    const t = new Date(d);
    t.setDate(t.getDate() - t.getDay());
    return t.toISOString().slice(0, 10);
  }
  return dayKey(d);
};

const pctGrowth = (curr, prev) => {
  if (!prev) return curr ? 100 : 0;
  return ((curr - prev) / prev) * 100;
};

// GET /api/admin/analytics/dashboard?range=30&granularity=daily|weekly|monthly
exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    const days = parseRangeDays(req.query.range);
    const granularity = ['daily', 'weekly', 'monthly'].includes(req.query.granularity) ? req.query.granularity : 'daily';
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);
    const prevSince = new Date(since);
    prevSince.setDate(prevSince.getDate() - days);

    const [orders, prevOrders, totalCustomers, newCustomerRows, prevNewCustomers, itemsInRange, inventory, recentOrders, totalProducts] = await Promise.all([
      req.prisma.order.findMany({ where: { createdAt: { gte: since } }, select: { total: true, status: true, createdAt: true, userId: true } }),
      req.prisma.order.findMany({ where: { createdAt: { gte: prevSince, lt: since } }, select: { total: true, status: true, createdAt: true } }),
      req.prisma.user.count({ where: { role: 'USER' } }),
      req.prisma.user.findMany({ where: { role: 'USER', createdAt: { gte: since } }, select: { createdAt: true } }),
      req.prisma.user.count({ where: { role: 'USER', createdAt: { gte: prevSince, lt: since } } }),
      req.prisma.orderItem.findMany({
        where: { order: { createdAt: { gte: since }, status: { notIn: EXCLUDED_STATUSES } } },
        select: {
          productId: true, quantity: true, subtotal: true, name: true,
          product: { select: { slug: true, images: { take: 1, select: { url: true } }, category: { select: { name: true } } } },
        },
      }),
      req.prisma.inventory.findMany({
        where: { trackInventory: true },
        include: { product: { select: { id: true, name: true, sku: true, slug: true, images: { take: 1, select: { url: true } } } } },
        orderBy: { quantity: 'asc' },
      }),
      req.prisma.order.findMany({
        take: 8, orderBy: { createdAt: 'desc' },
        select: { id: true, orderNumber: true, total: true, status: true, createdAt: true, user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      req.prisma.product.count({ where: { isActive: true } }),
    ]);

    const valid = orders.filter((o) => !EXCLUDED_STATUSES.includes(o.status));
    const prevValid = prevOrders.filter((o) => !EXCLUDED_STATUSES.includes(o.status));
    const revenue = valid.reduce((s, o) => s + toNum(o.total), 0);
    const prevRevenue = prevValid.reduce((s, o) => s + toNum(o.total), 0);
    const aov = valid.length ? revenue / valid.length : 0;
    const prevAov = prevValid.length ? prevRevenue / prevValid.length : 0;

    // Continuous buckets for the whole range
    const buckets = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const k = bucketKeyFor(d, granularity);
      if (!buckets[k]) buckets[k] = { key: k, revenue: 0, orders: 0, customers: 0 };
    }
    orders.forEach((o) => {
      const k = bucketKeyFor(o.createdAt, granularity);
      if (!buckets[k]) buckets[k] = { key: k, revenue: 0, orders: 0, customers: 0 };
      if (!EXCLUDED_STATUSES.includes(o.status)) buckets[k].revenue += toNum(o.total);
      buckets[k].orders += 1;
    });
    newCustomerRows.forEach((u) => {
      const k = bucketKeyFor(u.createdAt, granularity);
      if (buckets[k]) buckets[k].customers += 1;
    });
    const revenueSeries = Object.values(buckets).sort((a, b) => a.key.localeCompare(b.key));

    // Previous period series aligned by index (for comparison overlay)
    const prevBuckets = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(prevSince);
      d.setDate(prevSince.getDate() + i);
      const k = bucketKeyFor(d, granularity);
      if (!prevBuckets[k]) prevBuckets[k] = { key: k, revenue: 0 };
    }
    prevValid.forEach((o) => {
      const k = bucketKeyFor(o.createdAt, granularity);
      if (!prevBuckets[k]) prevBuckets[k] = { key: k, revenue: 0 };
      prevBuckets[k].revenue += toNum(o.total);
    });
    const prevRevenueSeries = Object.values(prevBuckets).sort((a, b) => a.key.localeCompare(b.key));

    // Customers who ordered in range / returning customers
    const perUserOrders = {};
    valid.forEach((o) => { if (o.userId) perUserOrders[o.userId] = (perUserOrders[o.userId] || 0) + 1; });
    const purchasingCustomers = Object.keys(perUserOrders).length;
    const returningCustomers = Object.values(perUserOrders).filter((n) => n > 1).length;
    const conversion = totalCustomers ? (purchasingCustomers / totalCustomers) * 100 : 0;

    // Sales heatmap: 7 (Sun..Sat) x 24 hours order counts
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      heatmap[d.getDay()][d.getHours()] += 1;
    });

    // Top products & best categories (aggregated in one pass, no N+1)
    const prodMap = {};
    const catMap = {};
    itemsInRange.forEach((it) => {
      if (!prodMap[it.productId]) {
        prodMap[it.productId] = { productId: it.productId, name: it.name, slug: it.product?.slug, image: it.product?.images?.[0]?.url || null, category: it.product?.category?.name || '—', units: 0, revenue: 0 };
      }
      prodMap[it.productId].units += it.quantity;
      prodMap[it.productId].revenue += toNum(it.subtotal);
      const cat = it.product?.category?.name || 'Uncategorised';
      if (!catMap[cat]) catMap[cat] = { category: cat, units: 0, revenue: 0 };
      catMap[cat].units += it.quantity;
      catMap[cat].revenue += toNum(it.subtotal);
    });
    const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    const bestCategories = Object.values(catMap).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

    const lowStockItems = inventory.filter((i) => i.quantity <= (i.lowStockThreshold ?? 10));

    res.status(200).json({
      status: 'success',
      data: {
        range: days,
        granularity,
        kpis: {
          revenue,
          orders: orders.length,
          totalCustomers,
          newCustomers: newCustomerRows.length,
          totalProducts,
          aov,
          conversion,
          purchasingCustomers,
          returningCustomers,
          returningRate: purchasingCustomers ? (returningCustomers / purchasingCustomers) * 100 : 0,
          growth: {
            revenue: pctGrowth(revenue, prevRevenue),
            orders: pctGrowth(orders.length, prevOrders.length),
            aov: pctGrowth(aov, prevAov),
            customers: pctGrowth(newCustomerRows.length, prevNewCustomers),
          },
          previous: { revenue: prevRevenue, orders: prevOrders.length, newCustomers: prevNewCustomers, aov: prevAov },
        },
        revenueSeries,
        prevRevenueSeries,
        heatmap,
        topProducts,
        bestCategories,
        lowStock: {
          items: lowStockItems.slice(0, 8).map((i) => ({ id: i.id, quantity: i.quantity, threshold: i.lowStockThreshold ?? 10, product: i.product })),
          count: lowStockItems.length,
          outOfStock: lowStockItems.filter((i) => i.quantity === 0).length,
        },
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          total: toNum(o.total),
          status: o.status,
          createdAt: o.createdAt,
          customer: `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim() || o.user?.email || 'Guest',
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
