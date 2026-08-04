const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const referralController = require('../controllers/referralController');

// Public: quick validity check for the registration form (no auth required)
router.get('/validate', referralController.validateCode);

// Authed customer endpoints
router.use(authenticate);
router.get('/me', referralController.getMyReferrals);

module.exports = router;
