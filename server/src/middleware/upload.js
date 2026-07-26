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

// Dedicated multer instance for resume/document uploads (PDF, DOC, DOCX). 10 MB limit.
const ALLOWED_MIME_RESUME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE_RESUME = 10 * 1024 * 1024; // 10 MB

const resumeFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_RESUME.includes(file.mimetype)) {
    return cb(new AppError('Only PDF, DOC or DOCX resumes are allowed.', 400), false);
  }
  cb(null, true);
};

const resumeUpload = multer({
  storage,
  fileFilter: resumeFilter,
  limits: { fileSize: MAX_SIZE_RESUME, files: 1 },
});

// Normalises multer errors into AppError so the global error handler formats them consistently.
const handleUploadErrors = (handler) => (req, res, next) => {
  handler(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError('File too large.', 400));
      return next(new AppError(err.message, 400));
    }
    if (err) return next(err);
    next();
  });
};

module.exports = {
  upload,
  resumeUpload,
  handleUploadErrors,
  ALLOWED_MIME,
  MAX_SIZE,
  ALLOWED_MIME_RESUME,
  MAX_SIZE_RESUME,
};
