const { AppError } = require('../utils/AppError');

// Get all reviews for a product
const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const reviews = await req.prisma.review.findMany({
      where: { productId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate average rating
    const avgRating = reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    const totalReviews = reviews.length;

    // Rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating]++;
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        reviews,
        avgRating: parseFloat(avgRating),
        totalReviews,
        distribution
      }
    });
  } catch (err) {
    next(err);
  }
};

// Create a review
const createReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return next(new AppError('Rating must be between 1 and 5', 400));
    }

    // Check if user already reviewed this product
    const existingReview = await req.prisma.review.findFirst({
      where: { userId, productId }
    });

    if (existingReview) {
      return next(new AppError('You have already reviewed this product', 400));
    }

    // Verify product exists
    const product = await req.prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    // Check if user purchased this product
    const hasOrdered = await req.prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
          status: { not: 'CANCELLED' }
        }
      }
    });

    const review = await req.prisma.review.create({
      data: {
        rating: parseInt(rating),
        comment: comment || null,
        userId,
        productId,
        isVerified: !!hasOrdered
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: review
    });
  } catch (err) {
    next(err);
  }
};

// Update a review
const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    const review = await req.prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    if (review.userId !== userId) {
      return next(new AppError('You can only update your own reviews', 403));
    }

    const updated = await req.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: rating ? parseInt(rating) : review.rating,
        comment: comment !== undefined ? comment : review.comment
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

// Delete a review
const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await req.prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return next(new AppError('Review not found', 404));
    }

    if (review.userId !== userId) {
      return next(new AppError('You can only delete your own reviews', 403));
    }

    await req.prisma.review.delete({
      where: { id: reviewId }
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Check if user can review (has purchased the product)
const canReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const userOrders = await req.prisma.order.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' }
      },
      include: {
        items: true
      }
    });

    const hasOrdered = userOrders.some(order => 
      order.items.some(item => item.productId === productId)
    );

    const hasReviewed = await req.prisma.review.findFirst({
      where: { userId, productId }
    });

    res.status(200).json({
      status: 'success',
      data: {
        canReview: hasOrdered && !hasReviewed,
        hasOrdered,
        hasReviewed: !!hasReviewed
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  canReview
};