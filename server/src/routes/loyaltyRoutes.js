const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const loyaltyController = require('../controllers/loyaltyController');

router.use(authenticate);
router.get('/wallet', loyaltyController.getWallet);
router.get('/history', loyaltyController.getHistory);
router.post('/preview-redeem', loyaltyController.previewRedemption);
router.get('/settings', loyaltyController.getPublicSettings);

module.exports = router;
