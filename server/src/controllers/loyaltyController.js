const { AppError } = require('../utils/AppError');
const loyalty = require('../utils/loyalty');

// GET /api/loyalty/wallet — current customer wallet + settings snapshot
exports.getWallet = async (req, res, next) => {
  try {
    const [wallet, settings] = await Promise.all([
      loyalty.getOrCreateWallet(req.prisma, req.user.id),
      loyalty.getSettings(req.prisma),
    ]);
    // upcoming expiry preview: total points in EARN batches expiring in <30d
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const soonBatches = await req.prisma.loyaltyTransaction.findMany({
      where: { userId: req.user.id, type: 'EARN', expiresAt: { lte: soon } },
      orderBy: { expiresAt: 'asc' },
    });
    const expiringSoon = soonBatches
      .map((b) => Math.max(0, b.points - b.consumed))
      .reduce((s, n) => s + n, 0);
    res.status(200).json({ status: 'success', data: { wallet, settings, expiringSoon } });
  } catch (e) { next(e); }
};

// GET /api/loyalty/history — paginated transaction feed for the current customer
exports.getHistory = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const where = { userId: req.user.id };
    if (req.query.type) where.type = req.query.type;
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

// POST /api/loyalty/preview-redeem { points, subtotal } — pre-flight check for the checkout page
exports.previewRedemption = async (req, res, next) => {
  try {
    const points = parseInt(req.body.points);
    const subtotal = parseFloat(req.body.subtotal);
    if (!Number.isFinite(points) || !Number.isFinite(subtotal)) {
      return next(new AppError('points and subtotal are required numeric fields', 400));
    }
    const result = await loyalty.validateRedemption(req.prisma, req.user.id, points, subtotal);
    res.status(200).json({ status: 'success', data: result });
  } catch (e) { next(e); }
};

// GET /api/loyalty/settings — public read-only, so the checkout UI can show min/max hints
exports.getPublicSettings = async (req, res, next) => {
  try {
    const s = await loyalty.getSettings(req.prisma);
    res.status(200).json({
      status: 'success',
      data: {
        isEnabled: s.isEnabled,
        earnRatePerRupee: s.earnRatePerRupee,
        redeemValuePerPoint: s.redeemValuePerPoint,
        minRedeemPoints: s.minRedeemPoints,
        maxRedeemPercent: s.maxRedeemPercent,
        expiryDays: s.expiryDays,
        registrationBonus: s.registrationBonus,
        firstOrderBonus: s.firstOrderBonus,
        reviewBonus: s.reviewBonus,
      },
    });
  } catch (e) { next(e); }
};
