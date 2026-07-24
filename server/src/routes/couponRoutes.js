const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const couponController = require('../controllers/couponController');

// Public route (requires login)
router.post('/validate', authenticate, couponController.validateCoupon);

// Admin routes
router.get('/', authenticate, authorize('ADMIN'), couponController.getAllCoupons);
router.post('/', authenticate, authorize('ADMIN'), couponController.createCoupon);
router.patch('/:id', authenticate, authorize('ADMIN'), couponController.updateCoupon);
router.delete('/:id', authenticate, authorize('ADMIN'), couponController.deleteCoupon);
router.patch('/:id/toggle', authenticate, authorize('ADMIN'), couponController.toggleCoupon);

module.exports = router;