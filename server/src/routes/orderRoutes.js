const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const couponController = require('../controllers/couponController');

router.use(authenticate);

// POST routes first (before parameterized routes)
router.post('/', orderController.createOrder);
router.post('/validate-coupon', couponController.validateCoupon);

// GET routes
router.get('/my-orders', orderController.getMyOrders);
router.get('/:id/invoice', orderController.generateInvoice);
router.patch('/:id/cancel', orderController.cancelOrder);
router.post('/:id/return', orderController.createReturnRequest);
router.get('/:id', orderController.getOrderById);

module.exports = router;