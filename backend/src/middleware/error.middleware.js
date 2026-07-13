// src/middleware/error.middleware.js
//
// Centralized error handler — the LAST middleware in the chain (see
// app.js). Every error, whether a deliberate AppError or something
// unexpected, ends up here and becomes the same consistent
// { success: false, error: { code, message } } response shape.
//
// Also handles orphaned-upload cleanup centrally: multer saves a file to
// disk BEFORE validation or the controller ever runs, so a file can be
// orphaned by a validation failure just as easily as a controller-level
// one. Handling cleanup here — not in the controller — covers both cases
// from one place instead of two.
//
// Must keep all 4 params (err, req, res, next) even though `next` is
// unused — that arity is how Express recognizes this as an error handler
// rather than ordinary middleware.

const fs = require('fs');
const logger = require('../utils/logger');

function cleanupOrphanedUpload(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err) logger.warn('Failed to clean up orphaned upload', { filePath, error: err.message });
  });
}

function errorHandler(err, req, res, next) {
  cleanupOrphanedUpload(req.file && req.file.path);

  if (err.isAppError) {
    if (err.statusCode >= 500) {
      // Still worth logging server-side even for "expected" 5xx errors
      // (e.g. Neo4j being unreachable) — the client message is
      // intentionally generic-ish, but we want the detail in our logs.
      logger.error(err.message, { code: err.code, statusCode: err.statusCode });
    }

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // Anything reaching here is a genuine bug or an unhandled edge case —
  // log the full error server-side (stack and all), but never leak
  // internals to the client.
  logger.error('Unexpected error', { message: err.message, stack: err.stack });

  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
  });
}

module.exports = errorHandler;
