// src/middleware/upload.middleware.js
// Wraps the configured multer instance so upload failures — wrong file
// type, file too large, no file at all — come back in our standard
// { success: false, error } shape with a sensible status code, instead of
// multer's raw error falling through to the generic 500 handler in app.js.

const multer = require('multer');
const upload = require('../config/multer');

function uploadImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Built-in multer failures — e.g. LIMIT_FILE_SIZE, LIMIT_UNEXPECTED_FILE
      return res.status(400).json({
        success: false,
        error: { code: `UPLOAD_${err.code}`, message: err.message },
      });
    }

    if (err) {
      // Our own fileFilter rejection (a plain Error, not a MulterError)
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_IMAGE', message: err.message },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_IMAGE',
          message: 'No image file was provided. Include it as multipart/form-data under the field name "image".',
        },
      });
    }

    next();
  });
}

module.exports = uploadImage;
