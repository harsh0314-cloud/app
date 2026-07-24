const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// Both routes are called by the frontend browser, so they need JSON parsing and Authentication
router.post('/create-razorpay-order', authenticate, paymentController.createRazorpayOrder);
router.post('/verify-razorpay', authenticate, paymentController.verifyRazorpayPayment);

module.exports = router;