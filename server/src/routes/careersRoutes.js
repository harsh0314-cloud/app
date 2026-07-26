const express = require('express');
const router = express.Router();
const careersController = require('../controllers/careersController');
const { resumeUpload, handleUploadErrors } = require('../middleware/upload');

// Public resume upload (proxied to Cloudinary; returns url + publicId).
router.post('/upload-resume', handleUploadErrors(resumeUpload.single('resume')), careersController.uploadResume);

// Public application submission (expects resumeUrl+resumePublicId from previous upload).
router.post('/apply', careersController.apply);

module.exports = router;
