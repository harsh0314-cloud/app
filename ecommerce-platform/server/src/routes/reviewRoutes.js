const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

// Public routes
router.get('/product/:productId', reviewController.getProductReviews);

// Protected routes
router.post('/product/:productId', authenticate, reviewController.createReview);
router.put('/:reviewId', authenticate, reviewController.updateReview);
router.delete('/:reviewId', authenticate, reviewController.deleteReview);
router.get('/can-review/:productId', authenticate, reviewController.canReview);

module.exports = router;