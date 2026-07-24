const { AppError } = require('../utils/AppError');

const PRODUCT_CARD = {
  id: true,
  name: true,
  slug: true,
  price: true,
  comparePrice: true,
  images: { where: { isPrimary: true }, take: 1, select: { url: true } },
  category: { select: { name: true } },
};

// POST /api/users/recently-viewed — record a product view for the logged-in user
exports.recordView = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) return next(new AppError('productId is required', 400));

    const product = await req.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return next(new AppError('Product not found', 404));

    // Keep a single most-recent entry per product per user
    await req.prisma.recentlyViewed.deleteMany({ where: { userId: req.user.id, productId } });
    await req.prisma.recentlyViewed.create({ data: { userId: req.user.id, productId } });

    // Trim to the latest 12 entries
    const all = await req.prisma.recentlyViewed.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const stale = all.slice(12).map((r) => r.id);
    if (stale.length) await req.prisma.recentlyViewed.deleteMany({ where: { id: { in: stale } } });

    res.status(201).json({ status: 'success', message: 'View recorded' });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/recently-viewed — list the logged-in user's recently viewed products
exports.listRecentlyViewed = async (req, res, next) => {
  try {
    const rows = await req.prisma.recentlyViewed.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { product: { select: PRODUCT_CARD } },
    });
    const products = rows.map((r) => r.product).filter((p) => p);
    res.status(200).json({ status: 'success', data: { products } });
  } catch (error) {
    next(error);
  }
};
