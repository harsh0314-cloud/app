const { AppError } = require('../utils/AppError');
const { isConfigured, uploadBuffer, destroyByUrl } = require('../utils/cloudinary');

// POST /api/admin/upload — upload one or more images to Cloudinary (admin only).
// Uses multer memoryStorage (req.files). Returns Cloudinary secure URLs + public_ids.
exports.uploadImages = async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return next(new AppError('Image upload is not configured. Please set CLOUDINARY_* environment variables.', 503));
    }
    const files = req.files || (req.file ? [req.file] : []);
    if (!files.length) return next(new AppError('No image file provided.', 400));

    const results = [];
    for (const file of files) {
      try {
        const uploaded = await uploadBuffer(file.buffer);
        results.push(uploaded);
      } catch (err) {
        console.error('[upload] cloudinary error:', err.message);
        return next(new AppError('Image upload failed. Please try again.', 502));
      }
    }

    res.status(201).json({ status: 'success', data: { images: results } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/upload — remove a previously uploaded Cloudinary image by URL (admin only).
exports.deleteImage = async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return next(new AppError('Image url is required.', 400));
    const result = await destroyByUrl(url);
    res.status(200).json({ status: 'success', data: { result } });
  } catch (error) {
    next(error);
  }
};
