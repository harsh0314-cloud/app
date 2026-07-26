const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload, handleUploadErrors } = require('../middleware/upload');
const { createReturnSchema } = require('../validators/returnValidators');

router.use(authenticate);

// Proof photo upload for return requests (Cloudinary, up to 5 images).
router.post('/upload', handleUploadErrors(upload.array('images', 5)), returnController.uploadProofImages);

// Per-order eligibility payload for the customer-side form.
router.get('/eligibility/:orderId', returnController.getEligibility);

// CRUD for the current user's return/exchange requests.
router.get('/', returnController.listMyReturns);
router.post('/', validate(createReturnSchema), returnController.createReturn);
router.get('/:id', returnController.getMyReturn);
router.patch('/:id/cancel', returnController.cancelMyReturn);

module.exports = router;
