// src/app.js
// Configures the Express application itself: middleware, routes, error
// handling. Exported (not started) — server.js is what actually listens.
//
// Multer is still not wired in yet — that's next (step 9b). This is now
// the skeleton plus CORS: body parsing, a health check to prove it's
// alive, a 404 fallback, and a basic error handler.

const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');

const app = express();

// ── Request logging ─────────────────────────────────────────────────────
// First, so it wraps everything else — logs once the response finishes,
// with the final status code and total duration. See utils/logger.js.
app.use(logger.requestLogger);

// ── CORS ───────────────────────────────────────────────────────────────────
// ALLOWED_ORIGINS is a comma-separated list in .env, or "*" for local dev.
// Native mobile requests (the actual MicroScan Edge app on a phone) don't
// enforce CORS at all — this matters for Expo Web (`expo start --web`,
// which runs in a real browser) and any future web dashboard.
const allowedOrigins = process.env.ALLOWED_ORIGINS || '*';

app.use(
  cors({
    origin: allowedOrigins === '*' ? '*' : allowedOrigins.split(',').map((o) => o.trim()),
  })
);

// ── Body parsing ─────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static file serving ────────────────────────────────────────────────────
// Uploaded images are saved here by multer (see config/multer.js) and
// referenced by URL in every analysis response — this is what makes those
// URLs actually resolve to something.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Health check ──────────────────────────────────────────────────────────
// Minimal and inline on purpose — this is NOT the real routes/ layer (that
// comes with the actual API endpoints later, at /api/v1/health). It exists
// purely so there's something to hit right now to prove the server boots.
app.get('/', (req, res) => {
  res.json({
    service: 'MicroScan Edge backend',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/analysis', require('./routes/analysis.routes'));
app.use('/api/v1/history', require('./routes/history.routes'));

// ── 404 fallback ───────────────────────────────────────────────────────────
// Anything reaching here matched no route above.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `No route for ${req.method} ${req.originalUrl}`,
    },
  });
});

// ── Error handler ──────────────────────────────────────────────────────────
// Centralized in middleware/error.middleware.js now — see that file for
// why AppError instances and unexpected bugs are handled differently.
app.use(require('./middleware/error.middleware'));

module.exports = app;
