const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const isConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const FOLDER = 'storex/products';

// Upload an in-memory buffer to Cloudinary and return { url, publicId }
const uploadBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: FOLDER, resource_type: 'image', transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });

// Derive a Cloudinary public_id from a stored secure_url (handles version + folder + extension)
const publicIdFromUrl = (url) => {
  try {
    if (!url || !url.includes('res.cloudinary.com')) return null;
    const afterUpload = url.split('/upload/')[1];
    if (!afterUpload) return null;
    // strip version segment like v1712345678/
    const noVersion = afterUpload.replace(/^v\d+\//, '');
    // strip file extension
    return noVersion.replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
};

// Delete an asset by its stored URL (only touches Cloudinary-hosted images)
const destroyByUrl = async (url) => {
  const publicId = publicIdFromUrl(url);
  if (!publicId) return { skipped: true };
  try {
    return await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    console.error('[cloudinary] destroy failed:', err.message);
    return { error: err.message };
  }
};

module.exports = { cloudinary, isConfigured, uploadBuffer, destroyByUrl, publicIdFromUrl, FOLDER };
