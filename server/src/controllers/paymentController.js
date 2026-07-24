const { calculateOrderTotals } = require('../utils/pricing');
const razorpay = require('razorpay');
const crypto = require('crypto');
const { AppError } = require('../utils/AppError');

// 1. Create Razorpay Order ID
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, addressLine1, city, state, postalCode, country, couponCode } = req.body;

    const cart = await req.prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: { include: { product: { include: { images: true } } } } }
    });

    if (!cart || cart.items.length === 0) {
      return next(new AppError('Your cart is empty', 400));
    }

    const activeItems = cart.items.filter((i) => !i.savedForLater);
    if (activeItems.length === 0) {
      return next(new AppError('Your bag has no items to check out (all are saved for later).', 400));
    }

    const subtotal = activeItems.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);

    // Apply coupon if provided
    let discount = 0;
    let appliedCouponId = null;
    if (couponCode) {
      const coupon = await req.prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (coupon && coupon.isActive) {
        const now = new Date();
        const withinWindow = now >= new Date(coupon.startDate) && now <= new Date(coupon.endDate);
        const underLimit = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;
        const meetsMin = !coupon.minOrderAmount || subtotal >= parseFloat(coupon.minOrderAmount);
        if (withinWindow && underLimit && meetsMin) {
          if (coupon.type === 'PERCENTAGE') {
            discount = (subtotal * parseFloat(coupon.value)) / 100;
          } else {
            discount = parseFloat(coupon.value);
          }
          if (coupon.maxDiscount && discount > parseFloat(coupon.maxDiscount)) {
            discount = parseFloat(coupon.maxDiscount);
          }
          if (discount > subtotal) discount = subtotal;
          appliedCouponId = coupon.id;
        }
      }
    }

    const pricing = calculateOrderTotals(subtotal, discount);

    const address = await req.prisma.address.create({
      data: { userId: req.user.id, firstName, lastName, phone, addressLine1, city, state, postalCode, country, isDefault: false }
    });

    const order = await req.prisma.order.create({
      data: {
        orderNumber: 'ORD-' + Date.now(),
        userId: req.user.id,
        addressId: address.id,
        couponId: appliedCouponId,
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        shippingCost: pricing.shippingCost,
        tax: pricing.tax,
        total: pricing.total,
        status: 'PENDING',
        paymentMethod: 'RAZORPAY',
        items: {
          create: activeItems.map(item => ({
            productId: item.productId,
            name: item.product.name,
            image: item.product.images[0]?.url || null,
            price: parseFloat(item.product.price).toFixed(2),
            quantity: item.quantity,
            subtotal: (parseFloat(item.product.price) * item.quantity).toFixed(2)
          }))
        }
      }
    });

    const instance = new razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const razorpayOrder = await instance.orders.create({
      amount: Math.round(parseFloat(pricing.total) * 100),
      currency: "INR",
      receipt: order.orderNumber,
      notes: { 
        name: `${firstName} ${lastName}`, 
        email: req.user.email,
        orderId: order.id 
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        key: process.env.RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: "INR",
        name: "StoreX Purchase",
        description: `Order ${order.orderNumber}`,
        order_id: razorpayOrder.id,
        orderId: order.id, 
        prefill: {
          name: `${firstName} ${lastName}`,
          contact: phone,
        },
        theme: { color: "#111111" }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. Verify Payment (Called by Frontend after checkout)
exports.verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return next(new AppError('Missing payment verification details', 400));
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET?.trim()).update(body).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return next(new AppError('Invalid payment signature', 400));
    }

    const order = await req.prisma.order.findUnique({ 
      where: { id: orderId },
      include: { items: true } 
    });

    if (!order) return next(new AppError('Order not found', 404));

    // DUPLICATE PAYMENT PROTECTION (idempotency):
    // If this order is already confirmed OR a payment row already exists
    // (from a prior verify call or the webhook), do not re-process.
    const existingPayment = await req.prisma.payment.findFirst({
      where: { OR: [{ transactionId: razorpay_payment_id }, { orderId: order.id }] }
    });
    if (existingPayment || order.status === 'CONFIRMED') {
      return res.status(200).json({ status: 'success', message: 'Payment already verified' });
    }

    await req.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: 'CONFIRMED' } });

      await tx.payment.create({
        data: {
          orderId: order.id,
          method: 'RAZORPAY',
          status: 'COMPLETED',
          amount: order.total,
          currency: 'inr',
          transactionId: razorpay_payment_id,
          stripePaymentIntentId: razorpay_order_id,
        }
      });

      // Decrement Inventory (updateMany avoids P2025 if a record is missing)
      for (const item of order.items) {
        await tx.inventory.updateMany({
          where: { productId: item.productId },
          data: { quantity: { decrement: item.quantity } }
        });
      }

      // Clear Cart
      const cart = await tx.cart.findUnique({ where: { userId: req.user.id } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id, savedForLater: false } });
      }
    });

    res.status(200).json({ status: 'success', message: 'Payment verified successfully' });
  } catch (error) {
    next(error);
  }
};

// 3. Razorpay Webhook (Called directly by Razorpay Server)
exports.handleWebhook = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!secret || !signature) {
      return res.status(400).json({ status: 'error', message: 'Missing webhook signature' });
    }

    const bodyString = req.body.toString();
    const expectedSignature = crypto.createHmac('sha256', secret.trim()).update(bodyString).digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ status: 'error', message: 'Invalid signature' });
    }

    const event = JSON.parse(bodyString);

    if (event.event === 'payment.captured') {
      const payload = event.payload?.payment?.entity;
      const orderId = payload.notes?.orderId;

      if (!orderId) return res.status(200).json({ status: 'success' });

      const order = await req.prisma.order.findUnique({ where: { id: orderId } });

      if (!order || order.status === 'CONFIRMED') {
        return res.status(200).json({ status: 'success' });
      }

      await req.prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id }, data: { status: 'CONFIRMED' } });

        const existingPayment = await tx.payment.findUnique({ where: { transactionId: payload.id } });
        if (!existingPayment) {
          await tx.payment.create({
            data: {
              orderId: order.id,
              method: 'RAZORPAY',
              status: 'COMPLETED',
              amount: order.total,
              currency: 'inr',
              transactionId: payload.id,
              stripePaymentIntentId: payload.order_id,
            }
          });
        }

        const orderItems = await tx.orderItem.findMany({ where: { orderId: order.id } });
        for (const item of orderItems) {
          await tx.inventory.updateMany({
            where: { productId: item.productId },
            data: { quantity: { decrement: item.quantity } }
          });
        }

        const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id, savedForLater: false } });
        }
      });
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('WEBHOOK ERROR:', error);
    // Return 500 so Razorpay retries on transient/unexpected failures
    res.status(500).json({ status: 'error', message: 'Webhook processing failed' });
  }
};