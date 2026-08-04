const { AppError } = require('../utils/AppError');
const referral = require('../utils/referral');

// GET /api/referrals/me — user's referral dashboard data
exports.getMyReferrals = async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, referralCode: true, isGuest: true },
    });
    if (!user) return next(new AppError('User not found', 404));
    if (user.isGuest) return next(new AppError('Guest users cannot access referrals', 403));

    const code = await referral.ensureReferralCode(req.prisma, user);

    const [referrals, rewards] = await Promise.all([
      req.prisma.referral.findMany({
        where: { referrerId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          referredUser: { select: { id: true, firstName: true, lastName: true, email: true, createdAt: true } },
        },
      }),
      req.prisma.referralReward.findMany({
        where: { userId: user.id, role: 'REFERRER' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalRewardPoints = rewards.reduce((s, r) => s + r.points, 0);
    const successful = referrals.filter((r) => r.status === 'REWARDED').length;

    const frontendBase = process.env.FRONTEND_URL || process.env.APP_URL || '';
    const shareLink = frontendBase
      ? `${frontendBase.replace(/\/$/, '')}/register?ref=${code}`
      : `/register?ref=${code}`;

    res.status(200).json({
      status: 'success',
      data: {
        code,
        shareLink,
        stats: {
          total: referrals.length,
          pending: referrals.filter((r) => r.status === 'PENDING').length,
          completed: referrals.filter((r) => r.status === 'COMPLETED').length,
          successful,
          rewardsPoints: totalRewardPoints,
        },
        referrals: referrals.map((r) => ({
          id: r.id,
          status: r.status,
          createdAt: r.createdAt,
          rewardedAt: r.rewardedAt,
          referredUser: r.referredUser ? {
            firstName: r.referredUser.firstName,
            lastName: r.referredUser.lastName,
            email: maskEmail(r.referredUser.email),
            joinedAt: r.referredUser.createdAt,
          } : null,
        })),
        rewards,
      },
    });
  } catch (e) { next(e); }
};

// GET /api/referrals/validate?code=STOREX-XXXX — public helper for the registration form
exports.validateCode = async (req, res, next) => {
  try {
    const raw = String(req.query.code || '').trim().toUpperCase();
    if (!raw) return res.status(200).json({ status: 'success', data: { valid: false } });
    const referrer = await req.prisma.user.findUnique({
      where: { referralCode: raw },
      select: { id: true, firstName: true, referralCode: true, isGuest: true },
    });
    if (!referrer || referrer.isGuest) {
      return res.status(200).json({ status: 'success', data: { valid: false } });
    }
    res.status(200).json({
      status: 'success',
      data: {
        valid: true,
        code: referrer.referralCode,
        referrerFirstName: referrer.firstName || 'a friend',
      },
    });
  } catch (e) { next(e); }
};

function maskEmail(email) {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const shown = local.slice(0, 2);
  return `${shown}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}
