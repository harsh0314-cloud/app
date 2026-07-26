const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Public form submission
router.post('/', contactController.submit);

module.exports = router;
