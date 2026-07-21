const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { changePasswordSchema } = require('../validators/authValidator'); // We'll reuse Zod here

router.use(authenticate);

router.patch('/password', validate(changePasswordSchema), userController.updatePassword);

module.exports = router;