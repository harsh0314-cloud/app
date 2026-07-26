const crypto = require('crypto');
const { AppError } = require('../utils/AppError');
const { sendReturnStatusEmail } = require('../utils/email');
const { createRazorpayRefund } = require('../utils/razorpayRefund');
const { creditWallet } = require('../utils/wallet');
const { isConfigured: cloudinaryConfigured, uploadBuffer, destroyByUrl } = require('../utils/cloudinary');
const { calculateOrderTotals } = require('../utils/pricing');

const RESERVED_STATUSES = ['APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP'];
const TERMINAL_STATUSES = ['REJECTED', 'COMPLETED', 'CANCELLED'];

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────
const notifyUser = async (prisma, { userId, title, message, data }) => {
  try {
    await prisma.notification.create({
      data: { userId, title, message, type: 'RETURN', data: data || {} },
    });
  } catch (e) {
    console.error('[notification] returns create failed:', e.message);
  }
};

const pushHistory = (tx, { requestId, status, note, changedBy, changedByRole }) =>
  tx.returnStatusHistory.create({
    data: { returnRequestId: requestId, status, note: note || null, changedBy: changedBy || null, changedByRole: changedByRole || null },
  });

const withinReturnWindow = (order, product) => {
  if (!order?.deliveredAt) return { ok: false, reason: 'Order is not delivered yet.' };
  const windowDays = Math.max(1, parseInt(product?.returnWindowDays || 15));
  const cutoff = new Date(order.deliveredAt);
  cutoff.setDate(cutoff.getDate() + windowDays);
  if (new Date() > cutoff) return { ok: false, reason: `Return window (${windowDays} days) has closed.` };
  return { ok: true, windowDays, cutoff };
};

// GET /api/returns/eligibility/:orderId — per-item eligibility payload used by the customer form.
exports.getEligibility = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = await req.prisma.order.findFirst({
      where: { id: orderId, userId: req.user.id },
      include: {
        items: { include: { product: { select: { id: true, name: true, isReturnable: true, isExchangeable: true, returnWindowDays: true, returnPolicy: true, exchangePolicy: true, variants: { where: { isActive: true }, select: { id: true, name: true, value: true, stock: true } }, inventory: { select: { quantity: true } } } } } },
        returnRequests: { include: { items: true } },
      },
    });
    if (!order) return next(new AppError('Order not found', 404));

    // Sum how many units of each order item are already committed to a non-cancelled/non-rejected request.
    // COMPLETED counts too — those units have physically left the customer.
    const usedQty = new Map();
    for (const r of order.returnRequests) {
      if (['CANCELLED', 'REJECTED'].includes(r.status)) continue;
      for (const it of r.items || []) {
        usedQty.set(it.orderItemId, (usedQty.get(it.orderItemId) || 0) + it.quantity);
      }
    }

    const deliverable = order.status === 'DELIVERED';
    const itemEligibility = order.items.map((it) => {
      const alreadyUsed = usedQty.get(it.id) || 0;
      const remaining = Math.max(0, it.quantity - alreadyUsed);
      const win = withinReturnWindow(order, it.product);
      const isReturnable = deliverable && it.product?.isReturnable && win.ok && remaining > 0;
      const isExchangeable = deliverable && it.product?.isExchangeable && win.ok && remaining > 0;
      return {
        orderItemId: it.id,
        productId: it.productId,
        name: it.name,
        image: it.image,
        size: it.size,
        price: it.price,
        quantity: it.quantity,
        alreadyRequestedQty: alreadyUsed,
        remainingQty: remaining,
        isReturnable,
        isExchangeable,
        reasonIfBlocked: !deliverable
          ? 'Order not delivered yet'
          : !it.product?.isReturnable && !it.product?.isExchangeable
            ? 'This product is marked non-returnable & non-exchangeable'
            : !win.ok
              ? win.reason
              : remaining <= 0
                ? 'Already requested for return/exchange'
                : null,
        returnWindowDays: it.product?.returnWindowDays || 15,
        returnPolicy: it.product?.returnPolicy || null,
        exchangePolicy: it.product?.exchangePolicy || null,
        // Available sizes for exchange (from product variants). We treat variants as size options.
        availableSizes: (it.product?.variants || [])
          .filter((v) => v.stock > 0 && v.value !== it.size)
          .map((v) => ({ id: v.id, name: v.name, value: v.value, stock: v.stock })),
      };
    });

    res.status(200).json({ status: 'success', data: { order: { id: order.id, orderNumber: order.orderNumber, status: order.status, deliveredAt: order.deliveredAt, paymentMethod: order.paymentMethod }, items: itemEligibility } });
  } catch (error) {
    next(error);
  }
};

// POST /api/returns/upload — upload proof photos to Cloudinary (authenticated customers).
// Reuses the same multer memoryStorage + Cloudinary pipeline used for product images.
exports.uploadProofImages = async (req, res, next) => {
  try {
    if (!cloudinaryConfigured()) {
      return next(new AppError('Image upload is not configured on this server.', 503));
    }
    const files = req.files || (req.file ? [req.file] : []);
    if (!files.length) return next(new AppError('No image file provided.', 400));
    if (files.length > 5) return next(new AppError('Upload up to 5 images per request.', 400));

    const results = [];
    for (const file of files) {
      try {
        const uploaded = await uploadBuffer(file.buffer);
        results.push(uploaded);
      } catch (err) {
        console.error('[return-upload] cloudinary error:', err.message);
        return next(new AppError('Image upload failed. Please try again.', 502));
      }
    }
    res.status(201).json({ status: 'success', data: { images: results } });
  } catch (error) {
    next(error);
  }
};

// POST /api/returns — create a per-item return/exchange request.
exports.createReturn = async (req, res, next) => {
  try {
    const { orderId, type, reason, subReason, comments, refundMethod, items, images } = req.body;

    const order = await req.prisma.order.findFirst({
      where: { id: orderId, userId: req.user.id },
      include: {
        items: { include: { product: { select: { id: true, isReturnable: true, isExchangeable: true, returnWindowDays: true } } } },
        payment: true,
        returnRequests: { include: { items: true } },
      },
    });
    if (!order) return next(new AppError('Order not found', 404));
    if (order.status === 'CANCELLED') return next(new AppError('Cancelled orders cannot be returned or exchanged.', 400));
    if (order.status !== 'DELIVERED') return next(new AppError('Only delivered orders are eligible.', 400));

    // Build lookup of quantities already committed to open requests.
    const usedQty = new Map();
    for (const r of order.returnRequests) {
      if (['CANCELLED', 'REJECTED'].includes(r.status)) continue;
      for (const it of r.items || []) usedQty.set(it.orderItemId, (usedQty.get(it.orderItemId) || 0) + it.quantity);
    }

    // Validate each requested item against the parent order.
    let refundEstimate = 0;
    for (const it of items) {
      const oi = order.items.find((x) => x.id === it.orderItemId);
      if (!oi) return next(new AppError('One of the selected items does not belong to this order.', 400));

      const product = oi.product;
      if (type === 'RETURN' && !product?.isReturnable) return next(new AppError(`${oi.name} is not returnable.`, 400));
      if (type === 'EXCHANGE' && !product?.isExchangeable) return next(new AppError(`${oi.name} is not exchangeable.`, 400));

      const win = withinReturnWindow(order, product);
      if (!win.ok) return next(new AppError(`${oi.name}: ${win.reason}`, 400));

      const remaining = Math.max(0, oi.quantity - (usedQty.get(oi.id) || 0));
      if (it.quantity > remaining) return next(new AppError(`${oi.name}: only ${remaining} unit(s) still eligible.`, 400));

      refundEstimate += parseFloat(oi.price) * it.quantity;
    }

    // For EXCHANGE, block if none of the items have a valid exchange size selected.
    if (type === 'EXCHANGE') {
      const anyHasSize = items.some((it) => it.exchangeSize || it.exchangeVariantId);
      if (!anyHasSize) return next(new AppError('Please pick an available size for at least one item to exchange.', 400));
    }

    const request = await req.prisma.$transaction(async (tx) => {
      const created = await tx.returnRequest.create({
        data: {
          orderId: order.id,
          userId: req.user.id,
          type,
          reason,
          subReason: subReason || null,
          comments: comments || null,
          refundMethod: type === 'EXCHANGE' ? null : (refundMethod || 'ORIGINAL'),
          refundAmount: type === 'EXCHANGE' ? null : refundEstimate.toFixed(2),
          status: 'PENDING',
          refundStatus: type === 'EXCHANGE' ? 'PENDING' : 'PENDING',
          items: {
            create: items.map((it) => ({
              orderItemId: it.orderItemId,
              quantity: it.quantity,
              reason: it.reason || null,
              subReason: it.subReason || null,
              exchangeSize: it.exchangeSize || null,
              exchangeVariantId: it.exchangeVariantId || null,
            })),
          },
          images: images && images.length ? { create: images.map((img) => ({ url: img.url, publicId: img.publicId || null })) } : undefined,
        },
        include: { items: true, images: true },
      });
      await pushHistory(tx, { requestId: created.id, status: 'PENDING', note: 'Request submitted by customer', changedBy: req.user.id, changedByRole: 'USER' });
      return created;
    });

    // Fire-and-forget notifications
    notifyUser(req.prisma, {
      userId: req.user.id,
      title: `${type === 'EXCHANGE' ? 'Exchange' : 'Return'} request submitted`,
      message: `Your request for order ${order.orderNumber} has been received.`,
      data: { requestId: request.id, orderId: order.id, status: 'PENDING' },
    });
    if (req.user?.email) {
      sendReturnStatusEmail(req.user.email, {
        requestId: request.id,
        orderNumber: order.orderNumber,
        status: 'PENDING',
        firstName: req.user.firstName,
        type,
      }).catch((e) => console.error('[email] return submitted failed:', e.message));
    }

    res.status(201).json({ status: 'success', data: { request }, message: `${type === 'EXCHANGE' ? 'Exchange' : 'Return'} request submitted` });
  } catch (error) {
    next(error);
  }
};

// GET /api/returns — list current user's returns
exports.listMyReturns = async (req, res, next) => {
  try {
    const returns = await req.prisma.returnRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        images: true,
        history: { orderBy: { createdAt: 'asc' } },
        order: { select: { orderNumber: true, total: true, paymentMethod: true } },
      },
    });
    res.status(200).json({ status: 'success', data: { returns } });
  } catch (error) {
    next(error);
  }
};

// GET /api/returns/:id — details (customer view — only own requests)
exports.getMyReturn = async (req, res, next) => {
  try {
    const request = await req.prisma.returnRequest.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        items: { include: { orderItem: true } },
        images: true,
        history: { orderBy: { createdAt: 'asc' } },
        order: { select: { orderNumber: true, total: true, paymentMethod: true, address: true } },
      },
    });
    if (!request) return next(new AppError('Return request not found', 404));
    res.status(200).json({ status: 'success', data: { request } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/returns/:id/cancel — customer cancels a still-pending request.
exports.cancelMyReturn = async (req, res, next) => {
  try {
    const request = await req.prisma.returnRequest.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!request) return next(new AppError('Return request not found', 404));
    if (request.status !== 'PENDING') return next(new AppError('Only pending requests can be cancelled.', 400));

    const updated = await req.prisma.$transaction(async (tx) => {
      const u = await tx.returnRequest.update({ where: { id: request.id }, data: { status: 'CANCELLED' } });
      await pushHistory(tx, { requestId: request.id, status: 'CANCELLED', note: 'Cancelled by customer', changedBy: req.user.id, changedByRole: 'USER' });
      return u;
    });

    notifyUser(req.prisma, {
      userId: req.user.id,
      title: 'Return request cancelled',
      message: `Your request has been cancelled as requested.`,
      data: { requestId: request.id, status: 'CANCELLED' },
    });
    if (req.user?.email) {
      const order = await req.prisma.order.findUnique({ where: { id: request.orderId }, select: { orderNumber: true } });
      sendReturnStatusEmail(req.user.email, {
        requestId: request.id,
        orderNumber: order?.orderNumber,
        status: 'CANCELLED',
        firstName: req.user.firstName,
        type: request.type,
      }).catch((e) => console.error('[email] return cancelled failed:', e.message));
    }

    res.status(200).json({ status: 'success', data: { request: updated }, message: 'Request cancelled' });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// ADMIN — list / details / stats / status transitions
// ────────────────────────────────────────────────────────────────
exports.adminListReturns = async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (q) {
      const qStr = String(q);
      where.OR = [
        { order: { orderNumber: { contains: qStr, mode: 'insensitive' } } },
        { user: { email: { contains: qStr, mode: 'insensitive' } } },
        { user: { firstName: { contains: qStr, mode: 'insensitive' } } },
        { user: { lastName: { contains: qStr, mode: 'insensitive' } } },
        { items: { some: { orderItem: { name: { contains: qStr, mode: 'insensitive' } } } } },
      ];
    }
    const returns = await req.prisma.returnRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { orderItem: true } },
        images: true,
        history: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        order: { select: { id: true, orderNumber: true, total: true, paymentMethod: true, deliveredAt: true } },
      },
    });
    res.status(200).json({ status: 'success', data: { returns } });
  } catch (error) {
    next(error);
  }
};

exports.adminGetReturn = async (req, res, next) => {
  try {
    const request = await req.prisma.returnRequest.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { orderItem: true } },
        images: true,
        history: { orderBy: { createdAt: 'asc' } },
        user: true,
        order: { include: { payment: true, address: true, items: true } },
      },
    });
    if (!request) return next(new AppError('Return request not found', 404));
    res.status(200).json({ status: 'success', data: { request } });
  } catch (error) {
    next(error);
  }
};

exports.adminStats = async (req, res, next) => {
  try {
    const [total, pending, approved, rejected, completed, refundAgg] = await Promise.all([
      req.prisma.returnRequest.count(),
      req.prisma.returnRequest.count({ where: { status: 'PENDING' } }),
      req.prisma.returnRequest.count({ where: { status: { in: ['APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP'] } } }),
      req.prisma.returnRequest.count({ where: { status: 'REJECTED' } }),
      req.prisma.returnRequest.count({ where: { status: 'COMPLETED' } }),
      req.prisma.returnRequest.aggregate({ _sum: { refundAmount: true }, where: { refundStatus: 'PROCESSED' } }),
    ]);
    const [returnsByType, exchangesCount] = await Promise.all([
      req.prisma.returnRequest.count({ where: { type: 'RETURN' } }),
      req.prisma.returnRequest.count({ where: { type: 'EXCHANGE' } }),
    ]);
    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          total,
          pending,
          approved,
          rejected,
          completed,
          totalRefundedAmount: refundAgg._sum.refundAmount || 0,
          returns: returnsByType,
          exchanges: exchangesCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/returns/:id — the workhorse status/refund/exchange controller.
exports.adminUpdateReturn = async (req, res, next) => {
  try {
    const { status, adminNote, refundAmount, refundMethod, pickupScheduledAt, exchangeTrackingNumber } = req.body;

    const request = await req.prisma.returnRequest.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { orderItem: true } },
        order: { include: { payment: true, items: true, user: true } },
        user: true,
      },
    });
    if (!request) return next(new AppError('Return request not found', 404));
    if (TERMINAL_STATUSES.includes(request.status)) {
      return next(new AppError(`This request is already ${request.status.toLowerCase()} and cannot be modified.`, 400));
    }

    const nextStatus = status || request.status;

    // Perform the transition atomically.
    const updated = await req.prisma.$transaction(async (tx) => {
      const data = {};
      if (adminNote !== undefined) data.adminNote = adminNote;
      if (refundAmount !== undefined && refundAmount !== null) data.refundAmount = parseFloat(refundAmount).toString();
      if (refundMethod !== undefined) data.refundMethod = refundMethod;
      if (status) data.status = status;

      // Reserve inventory when APPROVED for an EXCHANGE (decrement replacement stock).
      if (nextStatus === 'APPROVED' && request.type === 'EXCHANGE' && request.status === 'PENDING') {
        for (const item of request.items) {
          // Decrement product-level inventory for the (assumed) same product on exchange.
          await tx.inventory.updateMany({
            where: { productId: item.orderItem.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      if (nextStatus === 'PICKUP_SCHEDULED') {
        if (!pickupScheduledAt) throw new AppError('Please provide a pickup date/time.', 400);
        data.pickupScheduledAt = new Date(pickupScheduledAt);
      }
      if (nextStatus === 'PICKED_UP') data.pickedUpAt = new Date();

      // ── REFUND PROCESSED ────────────────────────────────────────
      if (nextStatus === 'REFUND_PROCESSED' && request.type === 'RETURN') {
        const method = refundMethod || request.refundMethod || 'ORIGINAL';
        const amt = parseFloat((refundAmount !== undefined && refundAmount !== null) ? refundAmount : (request.refundAmount || request.order.total));
        if (!amt || amt <= 0) throw new AppError('Refund amount must be greater than zero.', 400);

        data.refundMethod = method;
        data.refundAmount = amt.toString();
        data.refundedAt = new Date();
        data.refundStatus = 'PROCESSED';

        if (method === 'ORIGINAL') {
          const payment = request.order.payment;
          if (!payment || payment.method !== 'RAZORPAY' || !payment.transactionId) {
            throw new AppError('Original-payment refund is only available for paid Razorpay orders.', 400);
          }
          const refund = await createRazorpayRefund({
            paymentId: payment.transactionId,
            amount: amt,
            notes: { orderId: request.orderId, returnRequestId: request.id },
          });
          data.refundTransactionId = refund?.id || null;
          await tx.payment.update({ where: { orderId: request.orderId }, data: { status: 'REFUNDED' } });
        } else if (method === 'WALLET') {
          await creditWallet(tx, {
            userId: request.userId,
            amount: amt,
            reason: `Refund for return #${request.id}`,
            reference: request.id,
          });
          data.refundTransactionId = null;
        } else if (method === 'STORE_CREDIT') {
          const code = 'RTN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
          const now = new Date();
          const expiry = new Date(now);
          expiry.setDate(expiry.getDate() + 365);
          await tx.coupon.create({
            data: {
              code,
              type: 'FIXED',
              value: amt.toString(),
              maxDiscount: amt.toString(),
              usageLimit: 1,
              usedCount: 0,
              startDate: now,
              endDate: expiry,
              isActive: true,
            },
          });
          data.storeCreditCouponCode = code;
        }

        // Restock returned items to inventory (only on RETURN refund).
        for (const it of request.items) {
          await tx.inventory.updateMany({
            where: { productId: it.orderItem.productId },
            data: { quantity: { increment: it.quantity } },
          });
        }
      }

      // ── EXCHANGE SHIPPED ────────────────────────────────────────
      if (nextStatus === 'EXCHANGE_SHIPPED' && request.type === 'EXCHANGE') {
        if (!exchangeTrackingNumber && !request.exchangeTrackingNumber) {
          throw new AppError('Tracking number is required to mark exchange shipped.', 400);
        }
        data.exchangeShippedAt = new Date();
        if (exchangeTrackingNumber) data.exchangeTrackingNumber = exchangeTrackingNumber;

        // Create a replacement order (minimal — free shipment for the exchanged items only).
        if (!request.replacementOrderId) {
          const items = request.items.map((it) => ({
            productId: it.orderItem.productId,
            name: it.orderItem.name,
            size: it.exchangeSize || it.orderItem.size,
            image: it.orderItem.image,
            price: parseFloat(it.orderItem.price).toString(),
            quantity: it.quantity,
            subtotal: (parseFloat(it.orderItem.price) * it.quantity).toString(),
          }));
          const subtotal = items.reduce((s, x) => s + parseFloat(x.subtotal), 0);
          const pricing = calculateOrderTotals(subtotal, 0);
          const replacement = await tx.order.create({
            data: {
              orderNumber: 'EXC-' + Date.now(),
              userId: request.userId,
              addressId: request.order.addressId,
              subtotal: pricing.subtotal,
              discount: '0.00',
              shippingCost: '0.00',
              tax: '0.00',
              total: pricing.subtotal, // free replacement (no additional charge)
              status: 'SHIPPED',
              paymentMethod: request.order.paymentMethod,
              trackingNumber: exchangeTrackingNumber || request.exchangeTrackingNumber || null,
              shippedAt: new Date(),
              notes: `Replacement for return request ${request.id} (order ${request.order.orderNumber})`,
              items: { create: items },
            },
          });
          data.replacementOrderId = replacement.id;
        }
      }

      // ── COMPLETED — restock (if not already), close request ────
      if (nextStatus === 'COMPLETED') {
        if (request.type === 'RETURN' && request.status !== 'REFUND_PROCESSED') {
          // If they jump directly to COMPLETED without going through REFUND_PROCESSED
          for (const it of request.items) {
            await tx.inventory.updateMany({
              where: { productId: it.orderItem.productId },
              data: { quantity: { increment: it.quantity } },
            });
          }
        }
      }

      // ── REJECTED — release reserved exchange inventory if we ever decremented it
      // (i.e., the request has already progressed past APPROVED without producing a replacement order).
      if (nextStatus === 'REJECTED' && request.type === 'EXCHANGE'
          && RESERVED_STATUSES.includes(request.status)
          && !request.replacementOrderId) {
        for (const it of request.items) {
          await tx.inventory.updateMany({
            where: { productId: it.orderItem.productId },
            data: { quantity: { increment: it.quantity } },
          });
        }
      }

      const upd = await tx.returnRequest.update({ where: { id: request.id }, data });
      if (status) {
        await pushHistory(tx, {
          requestId: request.id,
          status,
          note: adminNote || null,
          changedBy: req.user.id,
          changedByRole: 'ADMIN',
        });
      }
      return upd;
    });

    // Best-effort email + notification to the customer.
    if (status && request.user?.email) {
      sendReturnStatusEmail(request.user.email, {
        requestId: request.id,
        orderNumber: request.order.orderNumber,
        status,
        firstName: request.user.firstName,
        type: request.type,
        refundAmount: updated.refundAmount,
        refundMethod: updated.refundMethod,
        pickupScheduledAt: updated.pickupScheduledAt,
        exchangeTrackingNumber: updated.exchangeTrackingNumber,
        adminNote: updated.adminNote,
      }).catch((e) => console.error('[email] return status failed:', e.message));
    }
    if (status) {
      notifyUser(req.prisma, {
        userId: request.userId,
        title: `Return ${status.replace(/_/g, ' ').toLowerCase()}`,
        message: `Your ${request.type.toLowerCase()} request for order ${request.order.orderNumber} is now ${status.replace(/_/g, ' ').toLowerCase()}.`,
        data: { requestId: request.id, status },
      });
    }

    res.status(200).json({ status: 'success', data: { request: updated }, message: 'Request updated' });
  } catch (error) {
    next(error);
  }
};
