const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');

// Public
router.post('/subscribe',   newsletterController.subscribe);
router.post('/unsubscribe', newsletterController.unsubscribe);

module.exports = router;
