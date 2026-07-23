const { AppError } = require('../utils/AppError');

// GET /api/users/addresses — list current user's addresses
exports.listAddresses = async (req, res, next) => {
  try {
    const addresses = await req.prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.status(200).json({ status: 'success', data: { addresses } });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/addresses — create a new address
exports.createAddress = async (req, res, next) => {
  try {
    const body = req.body;
    const existingCount = await req.prisma.address.count({ where: { userId: req.user.id } });
    const makeDefault = body.isDefault === true || existingCount === 0;

    const address = await req.prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: {
          userId: req.user.id,
          label: body.label || null,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          addressLine1: body.addressLine1,
          addressLine2: body.addressLine2 || null,
          city: body.city,
          state: body.state,
          postalCode: body.postalCode,
          country: body.country,
          isDefault: makeDefault,
        },
      });
    });

    res.status(201).json({ status: 'success', data: { address } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/addresses/:id — update an address (ownership enforced)
exports.updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await req.prisma.address.findFirst({ where: { id, userId: req.user.id } });
    if (!existing) return next(new AppError('Address not found', 404));

    const body = req.body;
    const fields = ['label', 'firstName', 'lastName', 'phone', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country'];
    const data = {};
    fields.forEach((f) => { if (body[f] !== undefined) data[f] = body[f]; });

    const address = await req.prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
        data.isDefault = true;
      }
      return tx.address.update({ where: { id }, data });
    });

    res.status(200).json({ status: 'success', data: { address } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/addresses/:id/default — set an address as default
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await req.prisma.address.findFirst({ where: { id, userId: req.user.id } });
    if (!existing) return next(new AppError('Address not found', 404));

    await req.prisma.$transaction([
      req.prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } }),
      req.prisma.address.update({ where: { id }, data: { isDefault: true } }),
    ]);

    const addresses = await req.prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.status(200).json({ status: 'success', data: { addresses } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/addresses/:id — delete an address (ownership enforced)
exports.deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await req.prisma.address.findFirst({ where: { id, userId: req.user.id } });
    if (!existing) return next(new AppError('Address not found', 404));

    await req.prisma.address.delete({ where: { id } });

    // If the deleted address was default, promote the most recent remaining one
    if (existing.isDefault) {
      const nextAddr = await req.prisma.address.findFirst({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (nextAddr) await req.prisma.address.update({ where: { id: nextAddr.id }, data: { isDefault: true } });
    }

    res.status(200).json({ status: 'success', message: 'Address deleted' });
  } catch (error) {
    if (error.code === 'P2003') {
      return next(new AppError('This address is linked to existing orders and cannot be deleted.', 409));
    }
    next(error);
  }
};
