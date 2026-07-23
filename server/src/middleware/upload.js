const multer = require('multer');
const { AppError } = require('../utils/AppError');

// In-memory storage so files can be streamed to a cloud provider (e.g. Cloudinary) without touching disk.
const storage = multer.memoryStorage();

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new AppError('Only JPEG, PNG, WEBP or GIF images are allowed.', 400), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE, files: 8 } });

// Normalises multer errors into AppError so the global error handler formats them consistently.
const handleUploadErrors = (handler) => (req, res, next) => {
  handler(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError('File too large. Max size is 5MB.', 400));
      return next(new AppError(err.message, 400));
    }
    if (err) return next(err);
    next();
  });
};

module.exports = { upload, handleUploadErrors, ALLOWED_MIME, MAX_SIZE };
