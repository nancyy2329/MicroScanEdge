// src/utils/AppError.js
//
// A single error class for every INTENTIONAL, expected failure in this
// app (bad input, not found, upstream dependency down) — as opposed to
// bugs/crashes, which should look different in logs and never get a
// clean message shown to the client. Carries the HTTP status code and a
// machine-readable code alongside the human message, so
// error.middleware.js never has to guess what response to send.
//
// This replaces two shortcuts used earlier in this build: string-matching
// on `err.message.startsWith(...)` in analysis.controller.js, and
// manually bolting `err.statusCode = X` onto plain Error objects.

class AppError extends Error {
  /**
   * @param {string} message - human-readable, safe to show the client
   * @param {number} statusCode - HTTP status code
   * @param {string} code - machine-readable identifier, e.g. "NOT_FOUND"
   * @param {object|null} [details] - optional extra context (e.g. validation errors)
   */
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    // A plain boolean flag is a cheap, dependency-free way for
    // error.middleware.js to distinguish "an error we deliberately threw"
    // from "an unexpected bug" without needing `instanceof` across
    // potential module-duplication edge cases.
    this.isAppError = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details = null) {
    return new AppError(message, 400, code, details);
  }

  static notFound(message, code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }

  static unprocessable(message, code = 'UNPROCESSABLE_ENTITY') {
    return new AppError(message, 422, code);
  }

  static serviceUnavailable(message, code = 'SERVICE_UNAVAILABLE') {
    return new AppError(message, 503, code);
  }
}

module.exports = AppError;
