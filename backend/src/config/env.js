// src/config/env.js
// Single source of truth for environment configuration. Loads .env, then
// validates that everything the app truly cannot run without is present —
// failing immediately with a specific list of what's missing, rather than
// letting the app boot and fail confusingly later. Optional variables get
// sensible defaults here, in one place, instead of scattered across files.

require('dotenv').config({ quiet: true });

const REQUIRED_VARS = ['NEO4J_URI', 'NEO4J_USERNAME', 'NEO4J_PASSWORD', 'SARVAM_API_KEY'];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill these in before starting the server.'
  );
}

if (!process.env.APP_ACCESS_KEY) {
  // Not fatal — the server can still run — but this means the analysis
  // endpoint has no access-control gate at all. Worth knowing, not worth
  // blocking a quick local test over.
  console.warn(
    'Warning: APP_ACCESS_KEY is not set. The API will accept requests from ' +
      'anyone who can reach it, with no access-control check at all.'
  );
}

const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',

  neo4j: {
    uri: process.env.NEO4J_URI,
    username: process.env.NEO4J_USERNAME,
    password: process.env.NEO4J_PASSWORD,
  },

  sarvam: {
    apiKey: process.env.SARVAM_API_KEY,
    baseUrl: process.env.SARVAM_API_BASE_URL || 'https://api.sarvam.ai',
    model: process.env.SARVAM_MODEL || 'sarvam-30b',
  },

  appAccessKey: process.env.APP_ACCESS_KEY || null,

  upload: {
    maxSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB) || 10,
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS || '*',
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 20,
  },
};

module.exports = config;
