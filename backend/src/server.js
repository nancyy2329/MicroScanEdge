// server.js
// Entry point — loads environment variables, starts the HTTP server,
// and sets up process-level safety nets (crash logging, graceful shutdown).
//
// Keeps almost no logic of its own on purpose: everything about *how*
// the app behaves lives in src/app.js and below. This file only answers
// "how do we boot, and how do we shut down cleanly?"

// Loading this validates all required env vars are present and throws
// immediately if not — see src/config/env.js.
require('./config/env');

const app = require('./app');
const { verifyConnection, ensureSchema, closeDriver } = require('./config/neo4jDriver');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 4000;

let server;

// Verify Neo4j is actually reachable and the schema is in place BEFORE
// accepting any HTTP traffic. A misconfigured URI/password should fail
// loudly here, at boot — not confusingly on a user's first request.
async function start() {
  try {
    await verifyConnection();
    logger.info('Connected to Neo4j AuraDB.');

    await ensureSchema();
    logger.info('Neo4j schema (constraints + indexes) verified.');

    server = app.listen(PORT, () => {
      logger.info('MicroScan Edge backend listening', { port: PORT, env: process.env.NODE_ENV || 'development' });
    });
  } catch (err) {
    logger.error('Startup failed — could not connect to Neo4j', { error: err.message });
    process.exit(1);
  }
}

start();

// ── Process-level safety nets ───────────────────────────────────────────
// Express 5 already forwards rejected promises from async route handlers
// to the error middleware, so these two handlers are a last resort for
// anything happening OUTSIDE a request/response cycle (a stray timer, a
// background job, a bug in code that runs at startup).

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : reason,
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — shutting down', { message: err.message, stack: err.stack });
  // Unlike a rejected promise, an uncaught synchronous exception means the
  // process is in an unknown state. Safer to exit and let the process
  // manager (nodemon locally, PM2/systemd/a platform restart policy in
  // production) start a clean instance than to keep serving requests.
  process.exit(1);
});

// ── Graceful shutdown ────────────────────────────────────────────────────
// Stop accepting new connections, let in-flight requests finish, close the
// Neo4j driver's connection pool, then exit.

function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully.`);

  if (!server) {
    // Signal arrived before startup finished (or startup already failed
    // and exited) — nothing listening to close, just release the driver.
    closeDriver().finally(() => process.exit(0));
    return;
  }

  server.close(() => {
    logger.info('HTTP server closed.');
    closeDriver().then(() => {
      logger.info('Neo4j driver closed.');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
