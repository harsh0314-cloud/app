// ────────────────────────────────────────────────────────────
// Loyalty service — pure & Prisma-aware helpers used by
// controllers and the nightly expiry job. Everything runs in
// a caller-provided transaction where atomicity matters.
// ────────────────────────────────────────────────────────────

const SETTINGS_ID = 'singleton';

// Read (create if missing) the singleton settings row.
async function getSettings(prisma) {
  const existing = await prisma.loyaltySettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  return prisma.loyaltySettings.create({ data: { id: SETTINGS_ID } });
}

async function updateSettings(prisma, patch) {
  const allowed = ['earnRatePerRupee', 'redeemValuePerPoint', 'minRedeemPoints', 'maxRedeemPercent',
    'expiryDays', 'registrationBonus', 'firstOrderBonus', 'reviewBonus', 'photoReviewBonus', 'isEnabled'];
  const data = {};
  for (const k of allowed) if (patch[k] !== undefined) data[k] = patch[k];
  const existing = await getSettings(prisma);
  return prisma.loyaltySettings.update({ where: { id: SETTINGS_ID }, data });
}

async function getOrCreateWallet(prisma, userId) {
  const existing = await prisma.loyaltyWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.loyaltyWallet.create({ data: { userId } });
}

// Convert amounts using the current settings ratios.
const rupeesToPoints = (rupees, settings) => Math.max(0, Math.floor(Number(rupees) * settings.earnRatePerRupee));
const pointsToRupees = (points, settings) => Math.round(points * settings.redeemValuePerPoint * 100) / 100;

// Credit points. Creates an EARN/ADJUSTMENT transaction and increments the wallet balance.
// meta: { type, reason, description?, referenceId?, referenceType?, createdBy?, settings, txId? }
async function credit(tx, userId, points, meta) {
  if (!points || points <= 0) return null;
  const wallet = await getOrCreateWallet(tx, userId);
  const settings = meta.settings || await getSettings(tx);
  const type = meta.type || 'EARN';
  const expiresAt = (type === 'EARN' && settings.expiryDays > 0)
    ? new Date(Date.now() + settings.expiryDays * 24 * 60 * 60 * 1000)
    : null;

  const updated = await tx.loyaltyWallet.update({
    where: { id: wallet.id },
    data: {
      pointsBalance: { increment: points },
      totalEarned:   type === 'EARN' ? { increment: points } : undefined,
    },
  });
  return tx.loyaltyTransaction.create({
    data: {
      walletId: wallet.id,
      userId,
      type,
      points,
      balanceAfter: updated.pointsBalance,
      reason: meta.reason,
      description: meta.description || null,
      referenceId: meta.referenceId || null,
      referenceType: meta.referenceType || null,
      expiresAt,
      createdBy: meta.createdBy || null,
    },
  });
}

// Debit points via FIFO consumption from earliest-expiring EARN batches.
// Throws if balance is insufficient. Returns the REDEEM/EXPIRE txn record.
async function debit(tx, userId, points, meta) {
  if (!points || points <= 0) throw new Error('Points to debit must be > 0');
  const wallet = await getOrCreateWallet(tx, userId);
  if (wallet.pointsBalance < points) throw new Error('Insufficient loyalty points');

  // FIFO consume from EARN batches
  let remaining = points;
  const earnBatches = await tx.loyaltyTransaction.findMany({
    where: {
      userId,
      type: 'EARN',
      consumed: { lt: 0 }, // placeholder; Prisma can't compare columns — filter in code below
    },
  }).catch(() => null);

  // Prisma cannot compare two columns natively for consumed<points, so pull candidates and filter
  const candidates = earnBatches || await tx.loyaltyTransaction.findMany({
    where: { userId, type: 'EARN' },
    orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
  });
  const eligible = candidates.filter((c) => c.points > c.consumed).sort((a, b) => {
    const ae = a.expiresAt ? a.expiresAt.getTime() : Infinity;
    const be = b.expiresAt ? b.expiresAt.getTime() : Infinity;
    if (ae !== be) return ae - be;
    return a.createdAt - b.createdAt;
  });

  for (const b of eligible) {
    if (remaining <= 0) break;
    const room = b.points - b.consumed;
    const take = Math.min(room, remaining);
    await tx.loyaltyTransaction.update({ where: { id: b.id }, data: { consumed: b.consumed + take } });
    remaining -= take;
  }

  // If remaining > 0 (shouldn't happen given balance check, but guard) — fall back to bulk debit anyway
  const type = meta.type || 'REDEEM';
  const updated = await tx.loyaltyWallet.update({
    where: { id: wallet.id },
    data: {
      pointsBalance: { decrement: points },
      totalRedeemed: type === 'REDEEM' ? { increment: points } : undefined,
      totalExpired:  type === 'EXPIRE' ? { increment: points } : undefined,
    },
  });

  return tx.loyaltyTransaction.create({
    data: {
      walletId: wallet.id,
      userId,
      type,
      points,
      balanceAfter: updated.pointsBalance,
      reason: meta.reason,
      description: meta.description || null,
      referenceId: meta.referenceId || null,
      referenceType: meta.referenceType || null,
      createdBy: meta.createdBy || null,
    },
  });
}

// Validate a redemption request during checkout. Returns { ok, error, discount, points } or throws.
async function validateRedemption(prisma, userId, points, subtotal) {
  const settings = await getSettings(prisma);
  if (!settings.isEnabled) return { ok: false, error: 'Loyalty program is disabled.' };
  if (!points || points <= 0) return { ok: false, error: 'Redeem points must be positive.' };
  if (points < settings.minRedeemPoints) return { ok: false, error: `Minimum redemption is ${settings.minRedeemPoints} points.` };

  const wallet = await getOrCreateWallet(prisma, userId);
  if (wallet.pointsBalance < points) return { ok: false, error: `You only have ${wallet.pointsBalance} points.` };

  const maxDiscountByPercent = (Number(subtotal) * settings.maxRedeemPercent) / 100;
  const requestedDiscount = pointsToRupees(points, settings);
  const discount = Math.min(requestedDiscount, maxDiscountByPercent);
  if (discount < requestedDiscount) {
    const capPoints = Math.floor(maxDiscountByPercent / settings.redeemValuePerPoint);
    return { ok: false, error: `You can redeem at most ${capPoints} points (${settings.maxRedeemPercent}% of subtotal) on this order.` };
  }

  return { ok: true, discount: Number(discount.toFixed(2)), points, settings, balance: wallet.pointsBalance };
}

// Expire points: sweep EARN batches whose expiresAt < now and consumed < points.
// Runs inside its own transaction per user.
async function expireForUser(prisma, userId) {
  const now = new Date();
  const settings = await getSettings(prisma);
  const expiredBatches = await prisma.loyaltyTransaction.findMany({
    where: { userId, type: 'EARN', expiresAt: { lt: now } },
  });
  let expiredTotal = 0;
  for (const b of expiredBatches) {
    const remaining = b.points - b.consumed;
    if (remaining > 0) expiredTotal += remaining;
  }
  if (expiredTotal <= 0) return { expired: 0 };

  return prisma.$transaction(async (tx) => {
    // Zero-out the consumed field for expired batches so they can no longer be used
    for (const b of expiredBatches) {
      const remaining = b.points - b.consumed;
      if (remaining > 0) {
        await tx.loyaltyTransaction.update({ where: { id: b.id }, data: { consumed: b.points } });
      }
    }
    await debit(tx, userId, expiredTotal, {
      type: 'EXPIRE',
      reason: 'Points expired',
      description: `${expiredTotal} points expired after ${settings.expiryDays} days`,
      referenceType: 'Expiry',
      settings,
    });
    return { expired: expiredTotal };
  });
}

async function expireAll(prisma) {
  const now = new Date();
  const rows = await prisma.loyaltyTransaction.groupBy({
    by: ['userId'],
    where: { type: 'EARN', expiresAt: { lt: now } },
  });
  let total = 0;
  for (const r of rows) {
    try {
      const res = await expireForUser(prisma, r.userId);
      total += res.expired;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[loyalty-expiry] user', r.userId, 'failed:', e.message);
    }
  }
  return { users: rows.length, expired: total };
}

module.exports = {
  SETTINGS_ID,
  getSettings, updateSettings, getOrCreateWallet,
  rupeesToPoints, pointsToRupees,
  credit, debit,
  validateRedemption,
  expireForUser, expireAll,
};
