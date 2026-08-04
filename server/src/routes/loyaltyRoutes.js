const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const loyaltyController = require('../controllers/loyaltyController');

// Public: safe subset of settings for the checkout / product pages
router.get('/settings', loyaltyController.getPublicSettings);

// Authed endpoints
router.use(authenticate);
router.get('/wallet', loyaltyController.getWallet);
router.get('/history', loyaltyController.getHistory);
router.post('/preview-redeem', loyaltyController.previewRedemption);

module.exports = router;
