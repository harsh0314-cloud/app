const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.patch('/:itemId', cartController.updateCartItem);
router.patch('/:itemId/save', cartController.toggleSaveForLater);
router.delete('/clear', cartController.clearCart); // NEW: Clear cart route
router.delete('/:itemId', cartController.removeFromCart);

module.exports = router;