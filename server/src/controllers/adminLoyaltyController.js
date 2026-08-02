const { AppError } = require('../utils/AppError');
const loyalty = require('../utils/loyalty');
const { logAudit, ACTIONS } = require('../utils/audit');

// GET /api/admin/loyalty/wallets — list wallets (search + pagination)
exports.listWallets = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const where = {};
    if (req.query.search) {
      where.user = { OR: [
        { email: { contains: req.query.search, mode: 'insensitive' } },
        { firstName: { contains: req.query.search, mode: 'insensitive' } },
        { lastName: { contains: req.query.search, mode: 'insensitive' } },
      ] };
    }
    const [total, wallets] = await req.prisma.$transaction([
      req.prisma.loyaltyWallet.count({ where }),
      req.prisma.loyaltyWallet.findMany({
        where, orderBy: { pointsBalance: 'desc' },
        skip: (page - 1) * limit, take: limit,
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
      }),
    ]);
    res.status(200).json({
      status: 'success',
      data: { wallets, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } },
    });
  } catch (e) { next(e); }
};

// GET /api/admin/loyalty/wallets/:userId — one wallet + last 50 transactions
exports.getWallet = async (req, res, next) => {
  try {
    const wallet = await loyalty.getOrCreateWallet(req.prisma, req.params.userId);
    const [txns, user] = await Promise.all([
      req.prisma.loyaltyTransaction.findMany({
        where: { walletId: wallet.id }, orderBy: { createdAt: 'desc' }, take: 50,
      }),
      req.prisma.user.findUnique({ where: { id: req.params.userId }, select: { id: true, email: true, firstName: true, lastName: true, role: true } }),
    ]);
    res.status(200).json({ status: 'success', data: { wallet, user, transactions: txns } });
  } catch (e) { next(e); }
};

// POST /api/admin/loyalty/wallets/:userId/adjust { points, direction: 'CREDIT'|'DEBIT', reason, notes }
exports.adjustWallet = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const points = parseInt(req.body.points);
    const direction = String(req.body.direction || 'CREDIT').toUpperCase();
    const reason = String(req.body.reason || '').trim() || 'Manual adjustment';
    const notes = req.body.notes ? String(req.body.notes) : null;
    if (!Number.isFinite(points) || points <= 0) return next(new AppError('points must be a positive integer', 400));
    if (!['CREDIT', 'DEBIT'].includes(direction)) return next(new AppError('direction must be CREDIT or DEBIT', 400));

    const target = await req.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!target) return next(new AppError('User not found', 404));

    let txn;
    await req.prisma.$transaction(async (tx) => {
      if (direction === 'CREDIT') {
        txn = await loyalty.credit(tx, userId, points, {
          type: 'ADJUSTMENT', reason, description: notes,
          referenceType: 'AdminAdjustment', referenceId: req.user.id,
          createdBy: req.user.id,
        });
      } else {
        const wallet = await loyalty.getOrCreateWallet(tx, userId);
        if (wallet.pointsBalance < points) throw new AppError(`User only has ${wallet.pointsBalance} points`, 400);
        txn = await loyalty.debit(tx, userId, points, {
          type: 'ADJUSTMENT', reason, description: notes,
          referenceType: 'AdminAdjustment', referenceId: req.user.id,
          createdBy: req.user.id,
        });
      }
    });

    await logAudit(req.prisma, req, ACTIONS.LOYALTY_ADJUST || 'LOYALTY_ADJUST', {
      entity: 'LoyaltyWallet', entityId: userId,
      newValue: { direction, points, reason, notes },
      message: `${direction === 'CREDIT' ? 'Credited' : 'Debited'} ${points} points for ${target.email}`,
    });
    res.status(200).json({ status: 'success', data: { transaction: txn } });
  } catch (e) { next(e); }
};

// GET /api/admin/loyalty/transactions — global feed
exports.listTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 25);
    const where = {};
    if (req.query.type) where.type = req.query.type;
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(req.query.from);
      if (req.query.to) {
        const end = new Date(req.query.to);
        if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.to)) end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    const [total, transactions] = await req.prisma.$transaction([
      req.prisma.loyaltyTransaction.count({ where }),
      req.prisma.loyaltyTransaction.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
    ]);
    res.status(200).json({
      status: 'success',
      data: { transactions, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } },
    });
  } catch (e) { next(e); }
};

// GET /api/admin/loyalty/settings
exports.getSettings = async (req, res, next) => {
  try {
    const s = await loyalty.getSettings(req.prisma);
    res.status(200).json({ status: 'success', data: { settings: s } });
  } catch (e) { next(e); }
};

// PATCH /api/admin/loyalty/settings
exports.updateSettings = async (req, res, next) => {
  try {
    const before = await loyalty.getSettings(req.prisma);
    const updated = await loyalty.updateSettings(req.prisma, req.body || {});
    await logAudit(req.prisma, req, ACTIONS.LOYALTY_SETTINGS_UPDATE || 'LOYALTY_SETTINGS_UPDATE', {
      entity: 'LoyaltySettings', entityId: 'singleton',
      previousValue: before, newValue: updated,
      message: 'Updated loyalty program settings',
    });
    res.status(200).json({ status: 'success', data: { settings: updated } });
  } catch (e) { next(e); }
};

// GET /api/admin/loyalty/stats
exports.getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [walletCount, totals, earnedThisMonth, redeemedThisMonth, expiredAll] = await Promise.all([
      req.prisma.loyaltyWallet.count(),
      req.prisma.loyaltyWallet.aggregate({ _sum: { pointsBalance: true, totalEarned: true, totalRedeemed: true, totalExpired: true } }),
      req.prisma.loyaltyTransaction.aggregate({ _sum: { points: true }, where: { type: 'EARN', createdAt: { gte: monthAgo } } }),
      req.prisma.loyaltyTransaction.aggregate({ _sum: { points: true }, where: { type: 'REDEEM', createdAt: { gte: monthAgo } } }),
      req.prisma.loyaltyTransaction.aggregate({ _sum: { points: true }, where: { type: 'EXPIRE' } }),
    ]);
    res.status(200).json({
      status: 'success',
      data: {
        walletCount,
        pointsInCirculation: totals._sum.pointsBalance || 0,
        totalEarned: totals._sum.totalEarned || 0,
        totalRedeemed: totals._sum.totalRedeemed || 0,
        totalExpired: expiredAll._sum.points || 0,
        earnedThisMonth: earnedThisMonth._sum.points || 0,
        redeemedThisMonth: redeemedThisMonth._sum.points || 0,
      },
    });
  } catch (e) { next(e); }
};
