const { AppError } = require('../utils/AppError');

const PRODUCT_INCLUDE = {
  category: { select: { name: true, slug: true } },
  brand: { select: { name: true } },
  images: { where: { isPrimary: true }, take: 1 },
  inventory: { select: { quantity: true } },
};

exports.getProducts = async (req, res, next) => {
  try {
    // 1. Extract query params and convert empty strings to null/undefined
    const search = req.query.search || undefined;
    const category = req.query.category || undefined;
    const brand = req.query.brand || undefined;
    const sort = req.query.sort || 'newest';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    // 2. Build the Where Clause safely
    const where = { isActive: true };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category) {
      where.category = { slug: category };
    }
    if (brand) {
      where.brand = { name: brand };
    }

    // 3. Build Order By safely
    let orderBy = { createdAt: 'desc' }; // Default to newest
    if (sort === 'price-asc') orderBy = { price: 'asc' };
    else if (sort === 'price-desc') orderBy = { price: 'desc' };

    // 4. Fetch Data and Total Count in parallel
    const [products, total] = await req.prisma.$transaction([
      req.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { name: true, slug: true } },
          brand: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1 },
          inventory: { select: { quantity: true } },
        },
      }),
      req.prisma.product.count({ where }),
    ]);

    // 5. Send Response
    res.status(200).json({
      status: 'success',
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
    });
  } catch (error) {
    // Print the EXACT error to the terminal if it still fails
    console.error("Product Fetch Error:", error);
    next(error);
  }
};

exports.getProductBySlug = async (req, res, next) => {
  try {
    const product = await req.prisma.product.findUnique({
      where: { slug: req.params.slug, isActive: true },
      include: {
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true } },
        images: { orderBy: { position: 'asc' } },
        variants: { where: { isActive: true } },
        inventory: true,
        reviews: { where: { isActive: true }, include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (!product) return next(new AppError('Product not found.', 404));
    res.status(200).json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
};

// Related products: same category, excluding the product itself
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const product = await req.prisma.product.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, categoryId: true },
    });
    if (!product) return next(new AppError('Product not found.', 404));

    let products = await req.prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, isActive: true },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: PRODUCT_INCLUDE,
    });

    // Fallback to featured/newest if the category is sparse
    if (products.length < 4) {
      const fill = await req.prisma.product.findMany({
        where: { isActive: true, id: { notIn: [product.id, ...products.map((p) => p.id)] } },
        take: 4 - products.length,
        orderBy: { isFeatured: 'desc' },
        include: PRODUCT_INCLUDE,
      });
      products = [...products, ...fill];
    }

    res.status(200).json({ status: 'success', data: { products } });
  } catch (error) {
    next(error);
  }
};

// Frequently bought together: products co-purchased in the same orders
exports.getFrequentlyBoughtTogether = async (req, res, next) => {
  try {
    const product = await req.prisma.product.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, categoryId: true },
    });
    if (!product) return next(new AppError('Product not found.', 404));

    const myItems = await req.prisma.orderItem.findMany({
      where: { productId: product.id },
      select: { orderId: true },
      take: 300,
    });
    const orderIds = myItems.map((i) => i.orderId);

    let rankedIds = [];
    if (orderIds.length) {
      const coItems = await req.prisma.orderItem.findMany({
        where: { orderId: { in: orderIds }, productId: { not: product.id } },
        select: { productId: true },
      });
      const freq = {};
      coItems.forEach((i) => { freq[i.productId] = (freq[i.productId] || 0) + 1; });
      rankedIds = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
    }

    let products = [];
    if (rankedIds.length) {
      const found = await req.prisma.product.findMany({
        where: { id: { in: rankedIds }, isActive: true },
        include: PRODUCT_INCLUDE,
      });
      // preserve frequency order
      products = rankedIds.map((id) => found.find((p) => p.id === id)).filter(Boolean);
    }

    // Fallback: same category
    if (products.length < 3) {
      const fill = await req.prisma.product.findMany({
        where: { categoryId: product.categoryId, isActive: true, id: { notIn: [product.id, ...products.map((p) => p.id)] } },
        take: 3 - products.length,
        orderBy: { isBestSeller: 'desc' },
        include: PRODUCT_INCLUDE,
      });
      products = [...products, ...fill];
    }

    res.status(200).json({ status: 'success', data: { products } });
  } catch (error) {
    next(error);
  }
};

// Lightweight search suggestions (name + thumbnail + price)
exports.getSearchSuggestions = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(200).json({ status: 'success', data: { suggestions: [] } });

    const products = await req.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 6,
      select: {
        id: true, name: true, slug: true, price: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        category: { select: { name: true } },
      },
    });

    res.status(200).json({ status: 'success', data: { suggestions: products } });
  } catch (error) {
    next(error);
  }
};