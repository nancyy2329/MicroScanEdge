// src/repositories/analysis.repository.js
//
// All Cypher for the Analysis/Image/FeatureSet/Explanation graph lives
// here, and ONLY here — see docs/architecture.md, section 2, for the
// schema this matches. Controllers never write Cypher directly; they call
// these functions.
//
// IMPORTANT TESTING NOTE: this module is validated against a MOCKED
// driver (see the test run for this file) — parameter marshaling, result
// parsing, and error propagation are exercised, but the Cypher itself has
// NOT been run against a real Neo4j instance. This sandbox has no network
// access to Neo4j's distribution servers and no Docker available, so a
// real local database isn't possible here. Run this against your actual
// AuraDB instance early — syntactically valid Cypher can still fail at
// runtime in ways a mock can't catch (e.g. a typo Neo4j itself would
// reject) or datatype conversions that only surface against the real
// driver (Neo4j's Integer and DateTime types are simplified below;
// double-check those against the real database's return values.

const { v4: uuidv4 } = require('uuid');
const neo4j = require('neo4j-driver');
const { getDriver } = require('../config/neo4jDriver');

const SCORING_VERSION = 'v1.0.0';

/**
 * Converts a Neo4j driver value (which may be a neo4j-driver Integer,
 * DateTime, or a plain JS primitive depending on the field) into a plain
 * JS value safe to JSON-serialize. Controllers should never receive a
 * raw Neo4j-typed object.
 */
function toPlainValue(value) {
  if (value && typeof value.toStandardDate === 'function') return value.toStandardDate().toISOString();
  if (value && typeof value.toNumber === 'function') return value.toNumber();
  return value;
}

/**
 * Persists one full analysis — the image record, its feature set, the
 * analysis result, and its explanation — plus the three relationships
 * connecting them, as a single write.
 *
 * @param {object} params
 * @param {object} params.image - { url, width, height, format, sizeBytes, source }
 * @param {object} params.features - output of imageFeature.service.js
 * @param {object} params.scoreResult - output of scoring.service.js's computeScore()
 * @param {object} params.explanation - output of sarvam.service.js's generateExplanation()
 * @param {number} params.processingTimeMs
 * @returns {Promise<{ analysisId: string, createdAt: string }>}
 */
async function saveAnalysis({ image, features, scoreResult, explanation, processingTimeMs }) {
  const driver = getDriver();

  const query = `
    CREATE (img:Image {
      id: $imageId, url: $imageUrl, width: $imageWidth, height: $imageHeight,
      format: $imageFormat, sizeBytes: $imageSizeBytes, source: $imageSource,
      capturedAt: datetime()
    })
    CREATE (fs:FeatureSet {
      id: $featureSetId, brightness: $brightness, edgeDensity: $edgeDensity,
      textureScore: $textureScore, particleEstimate: $particleEstimate,
      colorHistR: $colorHistR, colorHistG: $colorHistG, colorHistB: $colorHistB,
      extractedAt: datetime()
    })
    CREATE (a:Analysis {
      id: $analysisId, createdAt: datetime(), contaminationScore: $contaminationScore,
      riskLevel: $riskLevel, status: $status, scoringVersion: $scoringVersion,
      processingTimeMs: $processingTimeMs
    })
    CREATE (ex:Explanation {
      id: $explanationId, text: $explanationText, language: $explanationLanguage,
      modelUsed: $explanationModelUsed, generatedAt: datetime(), fallback: $explanationFallback
    })
    CREATE (img)-[:ANALYZED_AS]->(a)
    CREATE (a)-[:DERIVED_FROM]->(fs)
    CREATE (a)-[:EXPLAINED_BY]->(ex)
    RETURN a.id AS analysisId, a.createdAt AS createdAt
  `;

  const params = {
    imageId: uuidv4(),
    imageUrl: image.url,
    imageWidth: image.width,
    imageHeight: image.height,
    imageFormat: image.format,
    imageSizeBytes: image.sizeBytes,
    imageSource: image.source,

    featureSetId: uuidv4(),
    brightness: features.brightness,
    edgeDensity: features.edgeDensity,
    textureScore: features.textureScore,
    particleEstimate: features.particleEstimate,
    colorHistR: features.colorHistogram.r,
    colorHistG: features.colorHistogram.g,
    colorHistB: features.colorHistogram.b,

    analysisId: uuidv4(),
    contaminationScore: scoreResult.contaminationScore,
    riskLevel: scoreResult.riskLevel,
    status: explanation.fallback ? 'PARTIAL' : 'COMPLETE',
    scoringVersion: SCORING_VERSION,
    processingTimeMs,

    explanationId: uuidv4(),
    explanationText: explanation.text,
    explanationLanguage: explanation.language,
    explanationModelUsed: explanation.modelUsed,
    explanationFallback: explanation.fallback,
  };

  const { records } = await driver.executeQuery(query, params);
  const record = records[0];

  return {
    analysisId: record.get('analysisId'),
    createdAt: toPlainValue(record.get('createdAt')),
  };
}

/**
 * Fetches one analysis in full detail, including its image, feature set,
 * and explanation. Returns null if no analysis with that id exists.
 */
async function getAnalysisById(analysisId) {
  const driver = getDriver();

  const query = `
    MATCH (img:Image)-[:ANALYZED_AS]->(a:Analysis {id: $analysisId})
    MATCH (a)-[:DERIVED_FROM]->(fs:FeatureSet)
    OPTIONAL MATCH (a)-[:EXPLAINED_BY]->(ex:Explanation)
    RETURN img, a, fs, ex
  `;

  const { records } = await driver.executeQuery(query, { analysisId });
  if (records.length === 0) return null;

  return recordToAnalysisDTO(records[0]);
}

/**
 * Paginated history list, newest first, with optional score filtering.
 * Uses offset/limit pagination — fine at hackathon scale; see
 * docs/architecture.md section 10 for the cursor-based upgrade path if
 * this ever needs to handle a much larger history table.
 */
async function getHistory({ limit = 20, offset = 0, minScore, maxScore } = {}) {
  const driver = getDriver();

  const safeLimit = Math.floor(Number(limit));
  const safeOffset = Math.floor(Number(offset));

  const query = `
    MATCH (img:Image)-[:ANALYZED_AS]->(a:Analysis)
    WHERE ($minScore IS NULL OR a.contaminationScore >= $minScore)
      AND ($maxScore IS NULL OR a.contaminationScore <= $maxScore)
    RETURN img.url AS thumbnailUrl,
           a.id AS id,
           a.createdAt AS createdAt,
           a.contaminationScore AS contaminationScore,
           a.riskLevel AS riskLevel
    ORDER BY a.createdAt DESC
    SKIP $offset
    LIMIT $limit
  `;


  const { records } = await driver.executeQuery(query, {
  limit: neo4j.int(safeLimit),
  offset: neo4j.int(safeOffset),
  minScore: minScore ?? null,
  maxScore: maxScore ?? null,
});


  return records.map((record) => ({
    id: record.get('id'),
    createdAt: toPlainValue(record.get('createdAt')),
    contaminationScore: toPlainValue(record.get('contaminationScore')),
    riskLevel: record.get('riskLevel'),
    thumbnailUrl: record.get('thumbnailUrl'),
  }));
}
/**
 * Shared shape-conversion for a full (img, a, fs, ex) record into the
 * DTO the API returns — used by getAnalysisById, and reusable later
 * anywhere else a full analysis record needs the same shape.
 */
function recordToAnalysisDTO(record) {
  const img = record.get('img').properties;
  const a = record.get('a').properties;
  const fs = record.get('fs').properties;
  const ex = record.get('ex') ? record.get('ex').properties : null;

  return {
    id: a.id,
    createdAt: toPlainValue(a.createdAt),
    status: a.status,
    contaminationScore: toPlainValue(a.contaminationScore),
    riskLevel: a.riskLevel,
    processingTimeMs: toPlainValue(a.processingTimeMs),
    image: {
      url: img.url,
      width: toPlainValue(img.width),
      height: toPlainValue(img.height),
    },
    features: {
      brightness: toPlainValue(fs.brightness),
      edgeDensity: toPlainValue(fs.edgeDensity),
      textureScore: toPlainValue(fs.textureScore),
      particleEstimate: toPlainValue(fs.particleEstimate),
      colorHistogram: {
        r: fs.colorHistR.map(toPlainValue),
        g: fs.colorHistG.map(toPlainValue),
        b: fs.colorHistB.map(toPlainValue),
      },
    },
    explanation: ex
      ? {
          text: ex.text,
          language: ex.language,
          modelUsed: ex.modelUsed,
          fallback: ex.fallback,
        }
      : null,
  };
}

module.exports = { saveAnalysis, getAnalysisById, getHistory };
