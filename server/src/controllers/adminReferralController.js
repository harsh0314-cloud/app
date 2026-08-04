const { AppError } = require('../utils/AppError');

// GET /api/admin/referrals/analytics — headline metrics for the admin dashboard
exports.getAnalytics = async (req, res, next) => {
  try {
    const prisma = req.prisma;
    const [totalReferrals, pending, completed, rewarded, totalUsers, rewards] = await Promise.all([
      prisma.referral.count(),
      prisma.referral.count({ where: { status: 'PENDING' } }),
      prisma.referral.count({ where: { status: 'COMPLETED' } }),
      prisma.referral.count({ where: { status: 'REWARDED' } }),
      prisma.user.count({ where: { isGuest: false, role: 'USER' } }),
      prisma.referralReward.aggregate({ _sum: { points: true }, _count: { _all: true } }),
    ]);

    const conversionRate = totalReferrals > 0 ? (rewarded / totalReferrals) * 100 : 0;

    // Top referrers
    const topRaw = await prisma.referral.groupBy({
      by: ['referrerId'],
      where: { status: 'REWARDED' },
      _count: { _all: true },
      orderBy: { _count: { referrerId: 'desc' } },
      take: 10,
    });
    const topReferrerIds = topRaw.map((r) => r.referrerId);
    const topReferrerUsers = topReferrerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: topReferrerIds } },
          select: { id: true, email: true, firstName: true, lastName: true, referralCode: true },
        })
      : [];
    const topReferrers = topRaw.map((r) => {
      const u = topReferrerUsers.find((x) => x.id === r.referrerId);
      return {
        userId: r.referrerId,
        firstName: u?.firstName || null,
        lastName: u?.lastName || null,
        email: u?.email || null,
        referralCode: u?.referralCode || null,
        successfulReferrals: r._count._all,
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        totals: {
          totalReferrals,
          pending,
          completed,
          rewarded,
          totalUsers,
          rewardsIssued: rewards._count._all,
          rewardsPointsTotal: rewards._sum.points || 0,
        },
        conversionRate: Number(conversionRate.toFixed(2)),
        topReferrers,
      },
    });
  } catch (e) { next(e); }
};

// GET /api/admin/referrals — paginated referral list with filters
exports.list = async (req, res, next) => {
  try {
    const prisma = req.prisma;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.q) {
      where.OR = [
        { referralCode: { contains: String(req.query.q).toUpperCase() } },
        { referrer: { email: { contains: String(req.query.q), mode: 'insensitive' } } },
        { referredUser: { email: { contains: String(req.query.q), mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await prisma.$transaction([
      prisma.referral.count({ where }),
      prisma.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          referrer:     { select: { id: true, email: true, firstName: true, lastName: true, referralCode: true } },
          referredUser: { select: { id: true, email: true, firstName: true, lastName: true } },
          rewards: true,
        },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        items,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
    });
  } catch (e) { next(e); }
};
