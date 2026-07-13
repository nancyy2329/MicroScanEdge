// src/middleware/validate.middleware.js
//
// Generic Zod-based request validation. Given a schema and which part of
// the request to check, returns middleware that either replaces that part
// of the request with the parsed/coerced data (so downstream code — the
// controller — gets clean, already-defaulted values and doesn't need its
// own fallback logic) or fails with a single, consistent 400 AppError
// listing exactly what was wrong.

const AppError = require('../utils/AppError');

/**
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} [source]
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));

      return next(AppError.badRequest('Request validation failed.', 'VALIDATION_ERROR', details));
    }

    // req.query in Express 5 is a getter that recomputes a fresh object
    // from the raw query string on every access — confirmed via testing
    // that it's not even the same object reference twice in the same
    // request, so neither `req.query = result.data` nor mutating its
    // properties in place actually sticks. req.body IS a plain writable
    // property, but validated data goes on req.validated[source]
    // uniformly for both, so controllers have one predictable place to
    // read from regardless of which source they're validating.
    req.validated = req.validated || {};
    req.validated[source] = result.data;
    next();
  };
}

module.exports = validate;
