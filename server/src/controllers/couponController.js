const { AppError } = require('../utils/AppError');

exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return next(new AppError('Coupon code is required', 400));

    const coupon = await req.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon) return next(new AppError('Invalid coupon code', 404));
    if (!coupon.isActive) return next(new AppError('This coupon is no longer active', 400));
    if (new Date() < new Date(coupon.startDate)) return next(new AppError('Coupon is not yet valid', 400));
    if (new Date() > new Date(coupon.endDate)) return next(new AppError('Coupon has expired', 400));
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return next(new AppError('Coupon usage limit reached', 400));
    if (coupon.minOrderAmount && parseFloat(subtotal) < parseFloat(coupon.minOrderAmount)) {
      return next(new AppError(`Minimum order amount ₹${coupon.minOrderAmount} required`, 400));
    }

    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (parseFloat(subtotal) * parseFloat(coupon.value)) / 100;
    } else {
      discountAmount = parseFloat(coupon.value);
    }

    if (coupon.maxDiscount && discountAmount > parseFloat(coupon.maxDiscount)) {
      discountAmount = parseFloat(coupon.maxDiscount);
    }
    if (discountAmount > parseFloat(subtotal)) {
      discountAmount = parseFloat(subtotal);
    }

    res.status(200).json({
      status: 'success',
      data: {
        couponId: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount: discountAmount.toFixed(2),
        message: `Coupon applied! You saved ₹${discountAmount.toFixed(2)}`
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await req.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ status: 'success', data: coupons });
  } catch (error) {
    next(error);
  }
};

exports.createCoupon = async (req, res, next) => {
  try {
    const { code, type, value, minOrderAmount, maxDiscount, usageLimit, startDate, endDate } = req.body;

    if (!code || !type || !value || !startDate || !endDate) {
      return next(new AppError('Code, type, value, startDate, endDate are required', 400));
    }

    if (!['PERCENTAGE', 'FIXED'].includes(type)) {
      return next(new AppError('Type must be PERCENTAGE or FIXED', 400));
    }

    const coupon = await req.prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        type,
        value: parseFloat(value),
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true
      }
    });

    res.status(201).json({ status: 'success', data: coupon });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError('Coupon code already exists', 400));
    }
    next(error);
  }
};

exports.updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, type, value, minOrderAmount, maxDiscount, usageLimit, startDate, endDate, isActive } = req.body;

    const updateData = {};
    if (code) updateData.code = code.toUpperCase();
    if (type) updateData.type = type;
    if (value !== undefined) updateData.value = parseFloat(value);
    if (minOrderAmount !== undefined) updateData.minOrderAmount = minOrderAmount ? parseFloat(minOrderAmount) : null;
    if (maxDiscount !== undefined) updateData.maxDiscount = maxDiscount ? parseFloat(maxDiscount) : null;
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit ? parseInt(usageLimit) : null;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;

    const coupon = await req.prisma.coupon.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({ status: 'success', data: coupon });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new AppError('Coupon not found', 404));
    }
    next(error);
  }
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    await req.prisma.coupon.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Coupon deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new AppError('Coupon not found', 404));
    }
    next(error);
  }
};

exports.toggleCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await req.prisma.coupon.findUnique({ where: { id } });

    if (!coupon) return next(new AppError('Coupon not found', 404));

    const updated = await req.prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive }
    });

    res.status(200).json({ 
      status: 'success', 
      data: updated,
      message: `Coupon ${updated.isActive ? 'activated' : 'deactivated'}`
    });
  } catch (error) {
    next(error);
  }
};