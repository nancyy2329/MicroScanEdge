// src/config/neo4jDriver.js
// Neo4j AuraDB connection singleton.
//
// Created once, lazily, on first use — and reused everywhere else that
// needs to run a query (the repository layer, when it's built). Nothing
// outside this file should ever call neo4j.driver() directly.

const neo4j = require('neo4j-driver');

let driver;

/**
 * Returns the shared driver instance, creating it on first call.
 * Throws immediately with a clear message if required env vars are
 * missing — better to fail loudly at startup than on a user's first request.
 */
function getDriver() {
  if (!driver) {
    const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;

    if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
      throw new Error(
        'Missing Neo4j configuration. Check NEO4J_URI, NEO4J_USERNAME and ' +
          'NEO4J_PASSWORD in your .env file (see .env.example).'
      );
    }

    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));
  }

  return driver;
}

/**
 * Confirms the driver can actually reach AuraDB. Call this once at startup
 * so a wrong URI or password fails immediately and clearly, instead of
 * surfacing as a confusing 500 on whichever request happens to hit it first.
 */
async function verifyConnection() {
  await getDriver().verifyConnectivity();
}

/**
 * Creates the uniqueness constraints and indexes this app relies on, if
 * they don't already exist. Safe to run on every startup — `IF NOT EXISTS`
 * makes every statement a no-op after the first run.
 * Matches docs/architecture.md, section 2.
 */
async function ensureSchema() {
  const session = getDriver().session();
  try {
    const statements = [
      'CREATE CONSTRAINT analysis_id IF NOT EXISTS FOR (a:Analysis) REQUIRE a.id IS UNIQUE',
      'CREATE CONSTRAINT image_id IF NOT EXISTS FOR (i:Image) REQUIRE i.id IS UNIQUE',
      'CREATE CONSTRAINT featureset_id IF NOT EXISTS FOR (f:FeatureSet) REQUIRE f.id IS UNIQUE',
      'CREATE CONSTRAINT explanation_id IF NOT EXISTS FOR (e:Explanation) REQUIRE e.id IS UNIQUE',
      'CREATE INDEX analysis_created_at IF NOT EXISTS FOR (a:Analysis) ON (a.createdAt)',
      'CREATE INDEX analysis_score IF NOT EXISTS FOR (a:Analysis) ON (a.contaminationScore)',
    ];

    for (const statement of statements) {
      await session.run(statement);
    }
  } finally {
    await session.close();
  }
}

/**
 * Closes the driver's connection pool. Called from server.js during
 * graceful shutdown.
 */
async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = undefined;
  }
}

module.exports = { getDriver, verifyConnection, ensureSchema, closeDriver };
