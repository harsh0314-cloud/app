const express = require('express');
const router = express.Router();
const { getWishlist, addToWishlist, removeFromWishlist, checkWishlist } = require('../controllers/wishlistController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate); // All wishlist routes require login

router.route('/')
  .get(getWishlist)
  .post(addToWishlist);

router.route('/:productId')
  .delete(removeFromWishlist);

router.get('/check/:productId', checkWishlist);

module.exports = router;