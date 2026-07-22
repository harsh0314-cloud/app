const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../utils/AppError');

const prisma = new PrismaClient();

// ─── DASHBOARD ──────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalProducts = await prisma.product.count();
    const totalOrders = await prisma.order.count();
    const totalUsers = await prisma.user.count();
    const totalRevenue = await prisma.order.aggregate({
      _sum: { total: true },
    });

    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: true,
      },
    });

    const lowStockProducts = await prisma.product.findMany({
      where: {
        inventory: {
          quantity: { lte: 5 },
        },
      },
      include: { inventory: true },
    });

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalProducts,
          totalOrders,
          totalUsers,
          totalRevenue: totalRevenue._sum.total || 0,
        },
        recentOrders,
        lowStockProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PRODUCTS ───────────────────────────────────────────────────────
exports.getAllProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        inventory: true,
        images: { take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: { products },
    });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, slug, price, comparePrice, description, categoryId, brandId, inventory, images } = req.body;

    if (!name || !slug || !price || !categoryId || !brandId) {
      return next(new AppError('Name, slug, price, categoryId, brandId are required', 400));
    }

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name,
          slug,
          sku: req.body.sku || slug.toUpperCase().replace(/-/g, '_'),
          price: price.toString(),
          comparePrice: comparePrice ? comparePrice.toString() : null,
          description,
          categoryId,
          brandId,
          isActive: true,
          isNewArrival: req.body.isNewArrival || false,
          isBestSeller: req.body.isBestSeller || false,
        },
      });

      // Create inventory
      if (inventory) {
        await tx.inventory.create({
          data: {
            productId: newProduct.id,
            quantity: parseInt(inventory.quantity) || 0,
            lowStockThreshold: parseInt(inventory.lowStockThreshold) || 5,
          },
        });
      }

      // Create images - safely handle with or without position field
      if (images && images.length > 0) {
        const imageData = images.map((img, idx) => ({
          productId: newProduct.id,
          url: img.url,
          isPrimary: idx === 0,
        }));

        // Try with position first, fallback without
        try {
          await tx.productImage.createMany({
            data: imageData.map((img, idx) => ({ ...img, position: idx })),
          });
        } catch (posError) {
          // If position field doesn't exist, create without it
          await tx.productImage.createMany({ data: imageData });
        }
      } else {
        // Add default placeholder image if no images provided
        await tx.productImage.create({
          data: {
            productId: newProduct.id,
            url: 'https://via.placeholder.com/600x600?text=No+Image',
            isPrimary: true,
          },
        });
      }

      return newProduct;
    });

    res.status(201).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError('Product with this slug already exists', 400));
    }
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, price, comparePrice, description, categoryId, brandId, isActive, isNewArrival, isBestSeller } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (price !== undefined) updateData.price = price.toString();
    if (comparePrice !== undefined) updateData.comparePrice = comparePrice ? comparePrice.toString() : null;
    if (description !== undefined) updateData.description = description;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (brandId !== undefined) updateData.brandId = brandId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isNewArrival !== undefined) updateData.isNewArrival = isNewArrival;
    if (isBestSeller !== undefined) updateData.isBestSeller = isBestSeller;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new AppError('Product not found', 404));
    }
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id },
    });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new AppError('Product not found', 404));
    }
    next(error);
  }
};

// ─── INVENTORY ──────────────────────────────────────────────────────
exports.getAllInventory = async (req, res, next) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            images: { take: 1, select: { url: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: { inventory },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateInventory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, lowStockThreshold } = req.body;

    const updateData = {};
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = parseInt(lowStockThreshold);

    const inventory = await prisma.inventory.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      status: 'success',
      data: { inventory },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new AppError('Inventory record not found', 404));
    }
    next(error);
  }
};

exports.bulkUpdateInventory = async (req, res, next) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return next(new AppError('Updates array is required', 400));
    }

    await prisma.$transaction(
      updates.map((update) =>
        prisma.inventory.update({
          where: { id: update.id },
          data: {
            quantity: update.quantity !== undefined ? parseInt(update.quantity) : undefined,
            lowStockThreshold: update.lowStockThreshold !== undefined ? parseInt(update.lowStockThreshold) : undefined,
          },
        })
      )
    );

    res.status(200).json({
      status: 'success',
      message: `${updates.length} inventory records updated`,
    });
  } catch (error) {
    next(error);
  }
};

// ─── ORDERS ─────────────────────────────────────────────────────────
exports.getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          items: true,
          address: true,
          coupon: { select: { code: true } },
        },
      }),
      prisma.order.count(),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    const updateData = { status };
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (status === 'SHIPPED') updateData.shippedAt = new Date();
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (status === 'CANCELLED') updateData.cancelledAt = new Date();

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new AppError('Order not found', 404));
    }
    next(error);
  }
};

// ─── CUSTOMERS ──────────────────────────────────────────────────────
exports.getAllCustomers = async (req, res, next) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            addresses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: { customers },
    });
  } catch (error) {
    next(error);
  }
};

// ─── RETURNS / EXCHANGES ────────────────────────────────────────────
exports.getAllReturns = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const returns = await prisma.returnRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
            status: true,
            paymentMethod: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    res.status(200).json({ status: 'success', data: { returns } });
  } catch (error) {
    next(error);
  }
};

exports.updateReturnRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, refundAmount, adminNote } = req.body;
    const allowed = ['REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'];
    if (status && !allowed.includes(status)) {
      return next(new AppError('Invalid status.', 400));
    }

    const request = await prisma.returnRequest.findUnique({
      where: { id },
      include: { order: { include: { items: true, payment: true } } },
    });
    if (!request) return next(new AppError('Return request not found', 404));

    const updated = await prisma.$transaction(async (tx) => {
      const data = {};
      if (status) data.status = status;
      if (adminNote !== undefined) data.adminNote = adminNote;
      if (refundAmount !== undefined) data.refundAmount = refundAmount === null ? null : parseFloat(refundAmount);

      // On COMPLETED return: refund + restock + mark order REFUNDED
      if (status === 'COMPLETED') {
        if (data.refundAmount === undefined) data.refundAmount = parseFloat(request.order.total);
        await tx.order.update({ where: { id: request.orderId }, data: { status: 'REFUNDED' } });
        if (request.order.payment) {
          await tx.payment.update({ where: { orderId: request.orderId }, data: { status: 'REFUNDED' } });
        }
        for (const item of request.order.items) {
          await tx.inventory.updateMany({
            where: { productId: item.productId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      return tx.returnRequest.update({ where: { id }, data });
    });

    res.status(200).json({ status: 'success', data: { request: updated }, message: 'Return request updated' });
  } catch (error) {
    next(error);
  }
};

// ─── USERS (alias for getAllUsers if needed elsewhere) ──────────────
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new AppError('User not found', 404));
    }
    next(error);
  }
};

// ─── CATEGORIES ─────────────────────────────────────────────────────
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug, description } = req.body;

    if (!name || !slug) {
      return next(new AppError('Name and slug are required', 400));
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { category },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError('Category with this slug already exists', 400));
    }
    next(error);
  }
};

// ─── BRANDS ─────────────────────────────────────────────────────────
exports.getAllBrands = async (req, res, next) => {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: { brands },
    });
  } catch (error) {
    next(error);
  }
};

exports.createBrand = async (req, res, next) => {
  try {
    const { name, slug, description } = req.body;

    if (!name || !slug) {
      return next(new AppError('Name and slug are required', 400));
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        slug,
        description,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { brand },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError('Brand with this slug already exists', 400));
    }
    next(error);
  }
};