const { AppError } = require('../utils/AppError');
const { Prisma } = require('@prisma/client');

// 1. Get User's Wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const items = await req.prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: { 
        product: { 
          include: { 
            images: true,
            category: true
          } 
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    // Normalize to consistent API format: { status: 'success', data: [...] }
    res.status(200).json({ status: 'success', data: items });
  } catch (error) {
    next(error);
  }
};

// 2. Add Item to Wishlist
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) return next(new AppError('Product ID is required', 400));

    // Use upsert to prevent "Unique constraint failed" error if user clicks twice
    const item = await req.prisma.wishlist.upsert({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId: productId
        }
      },
      update: {}, // No update needed if it exists
      create: {
        userId: req.user.id,
        productId: productId
      },
      include: {
        product: {
          include: { images: true, category: true }
        }
      }
    });

    res.status(200).json({ status: 'success', data: item, message: 'Added to wishlist' });
  } catch (error) {
    next(error);
  }
};

// 3. Remove Item from Wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    await req.prisma.wishlist.deleteMany({
      where: {
        productId: productId,
        userId: req.user.id
      }
    });

    res.status(200).json({ status: 'success', data: null, message: 'Removed from wishlist' });
  } catch (error) {
    next(error);
  }
};

// 4. Check if product is in wishlist (useful for UI heart state)
exports.checkWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const item = await req.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId: productId
        }
      }
    });

    res.status(200).json({ status: 'success', data: { isWishlisted: !!item } });
  } catch (error) {
    next(error);
  }
};