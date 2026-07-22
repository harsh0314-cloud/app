const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validators/authValidator');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.getCurrentUser);

// Guest checkout
router.post('/guest', authController.guestSession);
router.patch('/guest-details', authenticate, authController.updateGuestDetails);

// Token lifecycle
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Email verification
router.post('/verify-email', authController.verifyEmail);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authenticate, authController.resendVerification);

// Password reset
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Newsletter Subscription (Mock)
router.post('/newsletter', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  console.log(`📩 New newsletter signup: ${email}`);
  res.status(200).json({ status: 'success', message: 'Subscribed successfully!' });
});

module.exports = router;
