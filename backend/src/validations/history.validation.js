// src/validations/history.validation.js
// Zod schema for the History list endpoint's query string.

const { z } = require('zod');

// z.coerce.number() handles query-string-to-number conversion (query
// params always arrive as strings) — invalid or out-of-range values now
// get a clean 400 instead of the controller silently substituting
// defaults for garbage input.
const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
});

module.exports = { historyQuerySchema };
