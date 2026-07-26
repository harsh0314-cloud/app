const Razorpay = require('razorpay');
const { AppError } = require('./AppError');

// Initiate a real Razorpay refund for an already-captured payment.
// Returns the Razorpay refund object on success. Throws AppError on failure.
async function createRazorpayRefund({ paymentId, amount, notes = {}, speed = 'normal' } = {}) {
  if (!paymentId) throw new AppError('Razorpay payment id is required to process a refund.', 400);
  if (!amount || amount <= 0) throw new AppError('Refund amount must be greater than zero.', 400);

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new AppError('Razorpay is not configured on this server (missing keys).', 503);
  }

  const instance = new Razorpay({ key_id, key_secret });

  try {
    // amount is in paise (INR minor units)
    const refund = await instance.payments.refund(paymentId, {
      amount: Math.round(parseFloat(amount) * 100),
      speed,
      notes,
    });
    return refund;
  } catch (err) {
    const message = err?.error?.description || err?.message || 'Razorpay refund failed';
    throw new AppError(`Razorpay refund failed: ${message}`, 502);
  }
}

module.exports = { createRazorpayRefund };
