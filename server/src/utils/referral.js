// ────────────────────────────────────────────────────────────
// Referral service — encapsulates code generation, attribution,
// and reward issuance. Idempotent by design.
// ────────────────────────────────────────────────────────────

const crypto = require('crypto');

const REFERRER_POINTS = Number(process.env.REFERRAL_REFERRER_POINTS || 500);
const REFERRED_POINTS = Number(process.env.REFERRAL_REFERRED_POINTS || 200);
const CODE_PREFIX = process.env.REFERRAL_CODE_PREFIX || 'STOREX';

// Generate a human-friendly, collision-resistant referral code.
// Format: STOREX-XXXXXX (base32-ish, uppercase A-Z 0-9 minus ambiguous chars)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCandidate(seed = null) {
  const raw = crypto.randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHABET[raw[i] % ALPHABET.length];
  if (seed) {
    const clean = String(seed).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (clean.length >= 3) out = `${clean}${out.slice(clean.length)}`;
  }
  return `${CODE_PREFIX}-${out}`;
}

async function generateUniqueCode(prisma, seedName) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = makeCandidate(attempt === 0 ? seedName : null);
    const exists = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  // Extreme fallback (should never hit): add extra entropy
  return `${CODE_PREFIX}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Ensure a user has a referral code. Idempotent.
async function ensureReferralCode(prisma, user) {
  if (user.referralCode) return user.referralCode;
  const code = await generateUniqueCode(prisma, user.firstName || user.email?.split('@')[0]);
  try {
    await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
    return code;
  } catch (e) {
    // race condition — refetch
    const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { referralCode: true } });
    return fresh?.referralCode || code;
  }
}

// Attribute a new registration to a referrer, given a referral code entered at signup.
// Returns the created Referral record OR null when no attribution happens.
// Security: rejects self-referral, unknown codes, guests, already-attributed users.
async function attributeReferral(prisma, { referralCode, newUser }) {
  if (!referralCode || !newUser?.id) return null;
  const code = String(referralCode).trim().toUpperCase();
  const referrer = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!referrer) return null;
  if (referrer.id === newUser.id) return null; // self-referral guard
  if (referrer.isGuest || newUser.isGuest) return null;

  // Prevent duplicate attribution
  const existing = await prisma.referral.findUnique({ where: { referredUserId: newUser.id } });
  if (existing) return existing;

  const [ref] = await prisma.$transaction([
    prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredUserId: newUser.id,
        referralCode: code,
        status: 'PENDING',
      },
    }),
    prisma.user.update({ where: { id: newUser.id }, data: { referredById: referrer.id } }),
  ]);
  return ref;
}

// Called after a referred user's first successful order.
// Idempotent: safe to call multiple times — will only reward once.
async function rewardOnFirstOrder(prisma, { userId, orderId }) {
  const referral = await prisma.referral.findUnique({ where: { referredUserId: userId } });
  if (!referral) return { rewarded: false, reason: 'no-referral' };
  if (referral.status === 'REWARDED') return { rewarded: false, reason: 'already-rewarded' };

  const loyalty = require('./loyalty');
  const settings = await loyalty.getSettings(prisma);

  const result = await prisma.$transaction(async (tx) => {
    // Guard: re-check inside the tx to avoid double reward under concurrency
    const fresh = await tx.referral.findUnique({ where: { id: referral.id } });
    if (!fresh || fresh.status === 'REWARDED') return { rewarded: false, reason: 'already-rewarded' };

    // Credit referrer
    await loyalty.credit(tx, fresh.referrerId, REFERRER_POINTS, {
      type: 'EARN',
      reason: 'Referral reward — friend completed first order',
      description: `Reward for referral ${fresh.referralCode}`,
      referenceType: 'Referral',
      referenceId: fresh.id,
      settings,
    });
    await tx.referralReward.create({
      data: { referralId: fresh.id, userId: fresh.referrerId, role: 'REFERRER', points: REFERRER_POINTS },
    });

    // Credit referred user (welcome bonus)
    await loyalty.credit(tx, fresh.referredUserId, REFERRED_POINTS, {
      type: 'EARN',
      reason: 'Welcome bonus — used referral code',
      description: `Welcome bonus for using ${fresh.referralCode}`,
      referenceType: 'Referral',
      referenceId: fresh.id,
      settings,
    });
    await tx.referralReward.create({
      data: { referralId: fresh.id, userId: fresh.referredUserId, role: 'REFERRED', points: REFERRED_POINTS },
    });

    // Mark completed + rewarded
    await tx.referral.update({
      where: { id: fresh.id },
      data: {
        status: 'REWARDED',
        firstOrderId: orderId,
        completedAt: fresh.completedAt || new Date(),
        rewardedAt: new Date(),
      },
    });
    return { rewarded: true, referralId: fresh.id, referrerId: fresh.referrerId, referredUserId: fresh.referredUserId };
  });

  return result;
}

module.exports = {
  REFERRER_POINTS,
  REFERRED_POINTS,
  CODE_PREFIX,
  generateUniqueCode,
  ensureReferralCode,
  attributeReferral,
  rewardOnFirstOrder,
};
