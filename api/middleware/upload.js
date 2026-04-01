const cloudinary             = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer                 = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:            'porto',
    allowed_formats:   ['jpg', 'jpeg', 'png', 'webp'],
    transformation:    [{ width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
});

// Smaller upload for user avatars — 200×200 face crop, max 2MB
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'porto/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation:  [{ width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }],
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits:  { fileSize: 2 * 1024 * 1024 }, // max 2MB
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype));
  },
});

module.exports = { upload, uploadAvatar, cloudinary };
