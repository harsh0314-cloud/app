const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../utils/AppError');
const { sendOrderStatusEmail } = require('../utils/email');
const { destroyByUrl } = require('../utils/cloudinary');
const { validateProductPricing } = require('../utils/pricing');

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
    const { name, slug, price, comparePrice, description, categoryId, brandId, inventory, images, keyHighlights, sizeGuide } = req.body;

    if (!name || !slug || !price || !categoryId || !brandId) {
      return next(new AppError('Name, slug, price, categoryId, brandId are required', 400));
    }

    // Enforce pricing rules: Selling Price > 0, MRP > 0 (when given), Selling Price <= MRP.
    const priceError = validateProductPricing(price, comparePrice);
    if (priceError) return next(new AppError(priceError, 400));

    const cleanHighlights = Array.isArray(keyHighlights)
      ? keyHighlights.map((h) => ({ label: h.label || h.name, value: h.value })).filter((h) => h.label && h.value)
      : undefined;
    const cleanSizeGuide =
      sizeGuide && Array.isArray(sizeGuide.columns) && sizeGuide.columns.filter(Boolean).length && Array.isArray(sizeGuide.rows) && sizeGuide.rows.length
        ? sizeGuide
        : undefined;

    // Optional Returns & Exchanges policy fields (fall back to sensible defaults on the schema).
    const rxFields = {};
    if (req.body.isReturnable !== undefined)   rxFields.isReturnable   = Boolean(req.body.isReturnable);
    if (req.body.isExchangeable !== undefined) rxFields.isExchangeable = Boolean(req.body.isExchangeable);
    if (req.body.returnWindowDays !== undefined) {
      const n = parseInt(req.body.returnWindowDays);
      if (!isNaN(n) && n > 0) rxFields.returnWindowDays = n;
    }
    if (req.body.returnPolicy !== undefined)   rxFields.returnPolicy   = req.body.returnPolicy || null;
    if (req.body.exchangePolicy !== undefined) rxFields.exchangePolicy = req.body.exchangePolicy || null;

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
          keyHighlights: cleanHighlights,
          sizeGuide: cleanSizeGuide,
          ...rxFields,
        },
      });

      // Always create an inventory record so the product appears in Admin Inventory.
      // Uses sensible defaults when no inventory payload is provided.
      await tx.inventory.create({
        data: {
          productId: newProduct.id,
          quantity: inventory && inventory.quantity !== undefined ? parseInt(inventory.quantity) || 0 : 0,
          lowStockThreshold:
            inventory && inventory.lowStockThreshold !== undefined
              ? parseInt(inventory.lowStockThreshold) || 10
              : 10,
          trackInventory: true,
        },
      });

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
    const { name, slug, price, comparePrice, description, categoryId, brandId, isActive, isNewArrival, isBestSeller, image, clearImage, keyHighlights, sizeGuide } = req.body;

    // Enforce pricing rules against the effective values (merge partial updates with what's stored).
    if (price !== undefined || comparePrice !== undefined) {
      const existing = await prisma.product.findUnique({ where: { id }, select: { price: true, comparePrice: true } });
      if (!existing) return next(new AppError('Product not found', 404));
      const effPrice = price !== undefined ? price : existing.price;
      const effCompare = comparePrice !== undefined ? comparePrice : existing.comparePrice;
      const priceError = validateProductPricing(effPrice, effCompare);
      if (priceError) return next(new AppError(priceError, 400));
    }

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
    if (keyHighlights !== undefined) {
      updateData.keyHighlights = Array.isArray(keyHighlights)
        ? keyHighlights.map((h) => ({ label: h.label || h.name, value: h.value })).filter((h) => h.label && h.value)
        : null;
    }
    if (sizeGuide !== undefined) {
      updateData.sizeGuide =
        sizeGuide && Array.isArray(sizeGuide.columns) && sizeGuide.columns.filter(Boolean).length && Array.isArray(sizeGuide.rows) && sizeGuide.rows.length
          ? sizeGuide
          : null;
    }

    // Returns & Exchanges policy fields
    if (req.body.isReturnable !== undefined)   updateData.isReturnable   = Boolean(req.body.isReturnable);
    if (req.body.isExchangeable !== undefined) updateData.isExchangeable = Boolean(req.body.isExchangeable);
    if (req.body.returnWindowDays !== undefined) {
      const n = parseInt(req.body.returnWindowDays);
      if (!isNaN(n) && n > 0) updateData.returnWindowDays = n;
    }
    if (req.body.returnPolicy !== undefined)   updateData.returnPolicy   = req.body.returnPolicy || null;
    if (req.body.exchangePolicy !== undefined) updateData.exchangePolicy = req.body.exchangePolicy || null;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Optional: clear the primary product image (deletes the record + Cloudinary asset; promotes any remaining image)
    if (clearImage === true) {
      const primary =
        (await prisma.productImage.findFirst({ where: { productId: id, isPrimary: true } })) ||
        (await prisma.productImage.findFirst({ where: { productId: id } }));
      if (primary) {
        const oldUrl = primary.url;
        await prisma.productImage.delete({ where: { id: primary.id } });
        if (oldUrl && oldUrl.includes('res.cloudinary.com')) {
          destroyByUrl(oldUrl).catch((e) => console.warn('[cloudinary] cleared image cleanup failed:', e.message));
        }
        const remaining = await prisma.productImage.findFirst({ where: { productId: id }, orderBy: { position: 'asc' } });
        if (remaining) await prisma.productImage.update({ where: { id: remaining.id }, data: { isPrimary: true } });
      }
    }
    // Optional primary-image replacement (image = new secure URL from Unsplash or Cloudinary)
    else if (image && typeof image === 'string') {
      const oldPrimary =
        (await prisma.productImage.findFirst({ where: { productId: id, isPrimary: true } })) ||
        (await prisma.productImage.findFirst({ where: { productId: id } }));
      const oldUrl = oldPrimary?.url;

      if (oldPrimary) {
        await prisma.productImage.update({ where: { id: oldPrimary.id }, data: { url: image, isPrimary: true } });
      } else {
        await prisma.productImage.create({ data: { productId: id, url: image, isPrimary: true } });
      }

      // Delete the previous asset from Cloudinary ONLY (never touch Unsplash/other URLs), and only if it changed
      if (oldUrl && oldUrl !== image && oldUrl.includes('res.cloudinary.com')) {
        destroyByUrl(oldUrl).catch((e) => console.warn('[cloudinary] old image cleanup failed:', e.message));
      }
    }

    const fresh = await prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { isPrimary: 'desc' } } },
    });

    res.status(200).json({
      status: 'success',
      data: { product: fresh || product },
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
    // Backfill: ensure every product has an inventory record so none are hidden.
    const productsMissingInventory = await prisma.product.findMany({
      where: { inventory: null },
      select: { id: true },
    });

    if (productsMissingInventory.length > 0) {
      await prisma.inventory.createMany({
        data: productsMissingInventory.map((p) => ({
          productId: p.id,
          quantity: 0,
          lowStockThreshold: 10,
          trackInventory: true,
        })),
        skipDuplicates: true,
      });
    }

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
          where: update.productId ? { productId: update.productId } : { id: update.id },
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

// Allowed order status transitions. Rejects invalid moves such as DELIVERED → PROCESSING.
// REFUNDED is a terminal state set by the returns module — not admin-transitionable here.
const ORDER_STATUS_TRANSITIONS = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED'],
  DELIVERED:  [],
  CANCELLED:  [],
  REFUNDED:   [],
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    if (!status || !Object.prototype.hasOwnProperty.call(ORDER_STATUS_TRANSITIONS, status)) {
      return next(new AppError('Invalid order status.', 400));
    }

    // Load current order first so we can validate the transition.
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Order not found', 404));

    if (existing.status !== status) {
      const allowed = ORDER_STATUS_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(status)) {
        return next(new AppError(
          `Cannot move order from ${existing.status} to ${status}. Allowed next: ${allowed.length ? allowed.join(', ') : 'none (terminal)'}.`,
          400
        ));
      }
    }

    const updateData = { status };
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (status === 'SHIPPED')   updateData.shippedAt   = new Date();
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (status === 'CANCELLED') updateData.cancelledAt = new Date();

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });

    // In-app notification + transactional email (best-effort, never blocks the response)
    if (order.userId) {
      prisma.notification.create({
        data: {
          userId: order.userId,
          title: `Order ${order.orderNumber} ${status.toLowerCase()}`,
          message: `Your order ${order.orderNumber} status is now ${status}.`,
          type: 'ORDER',
          data: { orderId: order.id, status },
        },
      }).catch((e) => console.error('[notification] create failed:', e.message));
    }
    if (order.user?.email) {
      sendOrderStatusEmail(order.user.email, {
        orderNumber: order.orderNumber,
        status,
        firstName: order.user.firstName,
        trackingNumber: order.trackingNumber,
      }).catch((e) => console.error('[email] order status failed:', e.message));
    }

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