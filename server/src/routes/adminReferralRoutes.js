const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireStaff, requirePermission } = require('../middleware/rbac');
const adminReferralController = require('../controllers/adminReferralController');

router.use(authenticate);
router.use(requireStaff);

router.get('/analytics', requirePermission('referral.view'), adminReferralController.getAnalytics);
router.get('/',          requirePermission('referral.view'), adminReferralController.list);

module.exports = router;
