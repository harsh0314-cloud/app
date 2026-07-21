const { calculateOrderTotals } = require('../utils/pricing');
const { AppError } = require('../utils/AppError');
const PDFDocument = require('pdfkit');

const money = (v) => `INR ${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

exports.generateInvoice = async (req, res, next) => {
  try {
    const whereClause = req.user.role === 'ADMIN'
      ? { id: req.params.id }
      : { id: req.params.id, userId: req.user.id };

    const order = await req.prisma.order.findUnique({
      where: whereClause,
      include: {
        items: true,
        address: true,
        payment: true,
        coupon: { select: { code: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!order) return next(new AppError('Order not found', 404));

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.pdf"`);
    doc.pipe(res);

    const INK = '#111111';
    const GREY = '#666666';

    // Header
    doc.fillColor(INK).fontSize(24).font('Helvetica-Bold').text('STOREX', 50, 50);
    doc.fontSize(9).font('Helvetica').fillColor(GREY).text('Considered essentials, made to endure.', 50, 78);
    doc.fontSize(20).font('Helvetica-Bold').fillColor(INK).text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor(GREY)
      .text(`Invoice #: ${order.orderNumber}`, 400, 78, { align: 'right' })
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 400, 92, { align: 'right' })
      .text(`Status: ${order.status}`, 400, 106, { align: 'right' });

    doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#e5e5e5').stroke();

    // Bill to
    const a = order.address || {};
    doc.fontSize(10).font('Helvetica-Bold').fillColor(INK).text('BILL TO', 50, 150);
    doc.font('Helvetica').fillColor(GREY).fontSize(10)
      .text(`${a.firstName || ''} ${a.lastName || ''}`.trim() || `${order.user?.firstName || ''} ${order.user?.lastName || ''}`, 50, 168)
      .text(order.user?.email || '', 50, 182)
      .text(a.phone || '', 50, 196)
      .text([a.addressLine1, a.addressLine2].filter(Boolean).join(', '), 50, 210, { width: 240 })
      .text([a.city, a.state, a.postalCode].filter(Boolean).join(', '), 50, 224)
      .text(a.country || '', 50, 238);

    doc.fontSize(10).font('Helvetica-Bold').fillColor(INK).text('PAYMENT', 320, 150);
    doc.font('Helvetica').fillColor(GREY).fontSize(10)
      .text(`Method: ${order.paymentMethod === 'RAZORPAY' ? 'Razorpay (Online)' : 'Cash on Delivery'}`, 320, 168, { width: 225 })
      .text(`Payment status: ${order.payment?.status || 'PENDING'}`, 320, 182)
      .text(order.payment?.transactionId ? `Txn: ${order.payment.transactionId}` : '', 320, 196, { width: 225 });

    // Items table
    let y = 280;
    doc.rect(50, y, 495, 22).fill('#111111');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
      .text('ITEM', 58, y + 7)
      .text('QTY', 330, y + 7)
      .text('PRICE', 380, y + 7, { width: 70, align: 'right' })
      .text('SUBTOTAL', 460, y + 7, { width: 78, align: 'right' });
    y += 22;

    doc.font('Helvetica').fontSize(9).fillColor(INK);
    order.items.forEach((it) => {
      doc.fillColor(INK)
        .text(it.name, 58, y + 8, { width: 260 })
        .text(String(it.quantity), 330, y + 8)
        .text(money(it.price), 380, y + 8, { width: 70, align: 'right' })
        .text(money(it.subtotal), 460, y + 8, { width: 78, align: 'right' });
      y += 26;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#eeeeee').stroke();
    });

    // Totals
    y += 12;
    const totalRow = (label, val, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10).fillColor(bold ? INK : GREY)
        .text(label, 350, y, { width: 110, align: 'right' })
        .text(val, 460, y, { width: 78, align: 'right' });
      y += bold ? 20 : 16;
    };
    totalRow('Subtotal', money(order.subtotal));
    if (parseFloat(order.discount) > 0) totalRow(`Discount${order.coupon?.code ? ' (' + order.coupon.code + ')' : ''}`, `- ${money(order.discount)}`);
    totalRow('Shipping', parseFloat(order.shippingCost) === 0 ? 'Free' : money(order.shippingCost));
    totalRow('Tax (18% GST)', money(order.tax));
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#111111').stroke();
    y += 8;
    totalRow('TOTAL', money(order.total), true);

    doc.fontSize(9).font('Helvetica').fillColor(GREY)
      .text('Thank you for shopping with StoreX.', 50, 760, { align: 'center', width: 495 });

    doc.end();
  } catch (error) {
    next(error);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, addressLine1, city, state, postalCode, country, couponCode, paymentMethod } = req.body;

    const cart = await req.prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: { include: { product: { include: { images: true } } } } }
    });

    if (!cart || cart.items.length === 0) {
      return next(new AppError('Your cart is empty', 400));
    }

    // Exclude items saved for later — only purchase active items
    const activeItems = cart.items.filter((i) => !i.savedForLater);
    if (activeItems.length === 0) {
      return next(new AppError('Your bag has no items to check out (all are saved for later).', 400));
    }

    const subtotal = activeItems.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);

    let discount = 0;
    let appliedCouponId = null;

    if (couponCode) {
      const coupon = await req.prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() }
      });

      if (coupon && coupon.isActive) {
        const now = new Date();
        const start = new Date(coupon.startDate);
        const end = new Date(coupon.endDate);

        if (now >= start && now <= end) {
          if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
            if (!coupon.minOrderAmount || subtotal >= parseFloat(coupon.minOrderAmount)) {
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
      }
    }

    const pricing = calculateOrderTotals(subtotal, discount);

    const address = await req.prisma.address.create({
      data: { userId: req.user.id, firstName, lastName, phone, addressLine1, city, state, postalCode, country, isDefault: false }
    });

    const order = await req.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
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
          status: 'CONFIRMED',
          paymentMethod: paymentMethod || 'CASH_ON_DELIVERY',
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

      if (appliedCouponId) {
        await tx.coupon.update({
          where: { id: appliedCouponId },
          data: { usedCount: { increment: 1 } }
        });
      }

      for (const item of activeItems) {
        await tx.inventory.updateMany({
          where: { productId: item.productId },
          data: { quantity: { decrement: item.quantity } }
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id, savedForLater: false } });
      return newOrder;
    });

    res.status(201).json({ status: 'success', data: { order } });
  } catch (error) {
    next(error);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      req.prisma.order.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { 
          items: true,
          address: true,
          coupon: { select: { code: true, type: true, value: true } }
        }
      }),
      req.prisma.order.count({ where: { userId: req.user.id } })
    ]);

    res.status(200).json({ 
      status: 'success', 
      data: { 
        orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const whereClause = req.user.role === 'ADMIN' 
      ? { id: req.params.id } 
      : { id: req.params.id, userId: req.user.id };

    const order = await req.prisma.order.findUnique({
      where: whereClause,
      include: {
        items: true,
        address: true,
        payment: true,
        returnRequests: { orderBy: { createdAt: 'desc' } },
        coupon: { select: { code: true, type: true, value: true } }
      }
    });

    if (!order) return next(new AppError('Order not found', 404));

    res.status(200).json({ status: 'success', data: { order } });
  } catch (error) {
    next(error);
  }
};

// Cancel an order (owner). Allowed before it ships.
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await req.prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { items: true, payment: true },
    });
    if (!order) return next(new AppError('Order not found', 404));

    const cancellable = ['PENDING', 'CONFIRMED', 'PROCESSING'];
    if (!cancellable.includes(order.status)) {
      return next(new AppError(`Order cannot be cancelled once it is ${order.status.toLowerCase()}.`, 400));
    }

    const updated = await req.prisma.$transaction(async (tx) => {
      const isPaid = order.payment && order.payment.status === 'COMPLETED';
      const o = await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      // Restock inventory
      for (const item of order.items) {
        await tx.inventory.updateMany({
          where: { productId: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }
      // Mark refund if it was paid online
      if (isPaid) {
        await tx.payment.update({ where: { orderId: order.id }, data: { status: 'REFUNDED' } });
      }
      return o;
    });

    res.status(200).json({ status: 'success', data: { order: updated }, message: 'Order cancelled' });
  } catch (error) {
    next(error);
  }
};

// Request a return or exchange (owner). Allowed after delivery.
exports.createReturnRequest = async (req, res, next) => {
  try {
    const { type = 'RETURN', reason } = req.body;
    if (!reason || !reason.trim()) return next(new AppError('A reason is required.', 400));
    if (!['RETURN', 'EXCHANGE'].includes(type)) return next(new AppError('Type must be RETURN or EXCHANGE.', 400));

    const order = await req.prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { returnRequests: true },
    });
    if (!order) return next(new AppError('Order not found', 404));
    if (order.status !== 'DELIVERED') {
      return next(new AppError('Returns/exchanges are only available for delivered orders.', 400));
    }

    const openRequest = order.returnRequests.find((r) => ['REQUESTED', 'APPROVED'].includes(r.status));
    if (openRequest) return next(new AppError('An active request already exists for this order.', 400));

    const request = await req.prisma.returnRequest.create({
      data: { orderId: order.id, userId: req.user.id, type, reason: reason.trim(), status: 'REQUESTED' },
    });

    res.status(201).json({ status: 'success', data: { request }, message: `${type === 'EXCHANGE' ? 'Exchange' : 'Return'} requested` });
  } catch (error) {
    next(error);
  }
};