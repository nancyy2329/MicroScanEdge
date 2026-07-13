// src/routes/history.routes.js
// Mounted at /api/v1/history in app.js.

const express = require('express');
const validate = require('../middleware/validate.middleware');
const { listHistory } = require('../controllers/history.controller');
const { historyQuerySchema } = require('../validations/history.validation');

const router = express.Router();

router.get('/', validate(historyQuerySchema, 'query'), listHistory);

module.exports = router;
