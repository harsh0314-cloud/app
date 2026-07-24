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
