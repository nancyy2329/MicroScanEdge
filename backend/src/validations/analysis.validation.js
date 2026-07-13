// src/validations/analysis.validation.js
// Zod schemas for the Analysis resource. Kept separate from
// routes/analysis.routes.js so the shape of a valid request is defined in
// one place, independent of how it's wired up.

const { z } = require('zod');

// multer populates req.body with the non-file multipart fields as plain
// strings before this ever runs — see analysis.routes.js for the order.
const createAnalysisBodySchema = z.object({
  language: z.string().trim().min(1).max(30).optional().default('English'),
  source: z.enum(['CAMERA', 'GALLERY']).optional().default('CAMERA'),
});

module.exports = { createAnalysisBodySchema };
