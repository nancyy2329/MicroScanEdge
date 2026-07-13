// src/routes/analysis.routes.js
// Routes for the Analysis resource: create one, read one. Mounted at
// /api/v1/analysis in app.js. No logic here beyond wiring middleware to
// controller functions — see analysis.controller.js for the actual work.

const express = require('express');
const uploadImage = require('../middleware/upload.middleware');
const validate = require('../middleware/validate.middleware');
const { createAnalysis, getAnalysis } = require('../controllers/analysis.controller');
const { createAnalysisBodySchema } = require('../validations/analysis.validation');

const router = express.Router();

// Order matters: multer must parse the multipart body BEFORE validation
// can inspect req.body, and before the controller can trust it.
router.post('/', uploadImage, validate(createAnalysisBodySchema, 'body'), createAnalysis);
router.get('/:id', getAnalysis);

module.exports = router;
