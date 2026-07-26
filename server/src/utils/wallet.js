// Small helpers to credit/debit a user's store wallet inside a Prisma transaction.
// Always run inside a $transaction so wallet balance and ledger stay consistent.

async function creditWallet(tx, { userId, amount, reason, reference }) {
  const user = await tx.user.update({
    where: { id: userId },
    data: { walletBalance: { increment: amount } },
    select: { walletBalance: true },
  });
  return tx.walletTransaction.create({
    data: {
      userId,
      type: 'CREDIT',
      amount: amount.toString(),
      balance: user.walletBalance.toString(),
      reason,
      reference,
    },
  });
}

async function debitWallet(tx, { userId, amount, reason, reference }) {
  const user = await tx.user.update({
    where: { id: userId },
    data: { walletBalance: { decrement: amount } },
    select: { walletBalance: true },
  });
  return tx.walletTransaction.create({
    data: {
      userId,
      type: 'DEBIT',
      amount: amount.toString(),
      balance: user.walletBalance.toString(),
      reason,
      reference,
    },
  });
}

module.exports = { creditWallet, debitWallet };
