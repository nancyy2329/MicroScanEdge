// src/config/multer.js
// Multer storage engine + file validation for uploaded microscope images.
// Exports a configured multer instance; src/middleware/upload.middleware.js
// wraps it with error handling before it's actually used in a route.

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Defensive — .gitkeep should guarantee this folder survives a fresh clone,
// but recreate it if it's ever missing rather than fail every upload.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// jpeg/png/webp cover most cameras; heic/heif/avif cover iOS's Expo SDK 54
// default (allowsEditing: false returns the original file, which can be
// HEIC on iPhones) until the feature-extraction step normalizes format.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Never trust the original filename — generate our own so there's no
    // collision risk and no path-traversal surface from a crafted name.
    const ext = path.extname(file.originalname) || '';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error(`Unsupported image type "${file.mimetype}". Accepted types: ${ALLOWED_MIME_TYPES.join(', ')}.`),
      false
    );
  }
  cb(null, true);
}

const maxSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB) || 10;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSizeMb * 1024 * 1024,
  },
});

module.exports = upload;
