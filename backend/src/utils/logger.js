// src/utils/logger.js
//
// Lightweight structured logging — no external dependency (pino/winston),
// since a hackathon-scale app doesn't need log shipping or file rotation
// yet. The log(level, message, meta) shape below would translate directly
// if this ever needs to feed a real log aggregator later.
//
// Two output formats: readable single-line text in development (what
// you're staring at during `npm run dev`), JSON lines in production
// (what a log aggregator wants to parse). Controlled by NODE_ENV, not a
// separate flag — one less thing to misconfigure.

const LEVELS = ['debug', 'info', 'warn', 'error'];

const MIN_LEVEL = LEVELS.includes(process.env.LOG_LEVEL) ? process.env.LOG_LEVEL : 'info';

// Belt-and-suspenders: even if a meta object accidentally includes a
// secret (a stray apiKey in a debug call, say), it never reaches the
// actual log output. Matches on substring, case-insensitively, so
// "sarvamApiKey" or "NEO4J_PASSWORD" both get caught.
const REDACTED_KEY_PATTERNS = ['password', 'apikey', 'api_key', 'authorization', 'secret', 'accesskey'];

function isSecretKey(key) {
  const lower = key.toLowerCase();
  return REDACTED_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
}

function redact(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  const clean = {};
  for (const [key, value] of Object.entries(meta)) {
    clean[key] = isSecretKey(key) ? '[REDACTED]' : value;
  }
  return clean;
}

function shouldLog(level) {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(MIN_LEVEL);
}

function formatLine(entry) {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }

  const { timestamp, level, message, ...meta } = entry;
  const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
  return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
}

function log(level, message, meta) {
  if (!shouldLog(level)) return;

  const entry = { timestamp: new Date().toISOString(), level, message, ...redact(meta) };
  const line = formatLine(entry);

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/**
 * Logs every request once it finishes (not when it starts) so the final
 * status code and total duration are both available. `res.on('finish')`
 * fires after the response has actually been sent, regardless of how the
 * route handler completed.
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    log(level, `${req.method} ${req.originalUrl}`, { statusCode: res.statusCode, durationMs });
  });

  next();
}

module.exports = {
  debug: (message, meta) => log('debug', message, meta),
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
  requestLogger,
};
