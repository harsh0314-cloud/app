const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const addressController = require('../controllers/addressController');
const notificationController = require('../controllers/notificationController');
const recentlyViewedController = require('../controllers/recentlyViewedController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { changePasswordSchema } = require('../validators/authValidator'); // We'll reuse Zod here
const { addressSchema, addressUpdateSchema, recentlyViewedSchema } = require('../validators/userValidators');

router.use(authenticate);

// Security — change password
router.patch('/password', validate(changePasswordSchema), userController.updatePassword);

// Saved addresses (CRUD + default)
router.get('/addresses', addressController.listAddresses);
router.post('/addresses', validate(addressSchema), addressController.createAddress);
router.patch('/addresses/:id/default', addressController.setDefaultAddress);
router.patch('/addresses/:id', validate(addressUpdateSchema), addressController.updateAddress);
router.delete('/addresses/:id', addressController.deleteAddress);

// Notifications
router.get('/notifications', notificationController.listNotifications);
router.patch('/notifications/read-all', notificationController.markAllRead);
router.patch('/notifications/:id/read', notificationController.markRead);

// Recently viewed (persisted for logged-in users)
router.get('/recently-viewed', recentlyViewedController.listRecentlyViewed);
router.post('/recently-viewed', validate(recentlyViewedSchema), recentlyViewedController.recordView);

module.exports = router;
