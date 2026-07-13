// src/controllers/analysis.controller.js
//
// Orchestrates the full pipeline for POST /api/v1/analysis (extract
// features -> score -> get an explanation -> persist -> respond), plus
// GET /api/v1/analysis/:id — grouped together because both are about the
// same resource (an Analysis), not because they share implementation.
// The list view (GET /api/v1/history) is a different enough concern that
// it lives in history.controller.js instead.

const AppError = require('../utils/AppError');
const { extractFeatures } = require('../services/imageFeature.service');
const { computeScore } = require('../services/scoring.service');
const { generateExplanation } = require('../services/sarvam.service');
const { saveAnalysis, getAnalysisById } = require('../repositories/analysis.repository');

async function createAnalysis(req, res, next) {
  const startTime = Date.now();

  try {
    const { path: imagePath, filename, size } = req.file;
    // validate.middleware.js (see analysis.routes.js) already guarantees
    // these are present and defaulted — no fallback logic needed here.
    // Reads from req.validated.body, not req.body directly — see the
    // comment in validate.middleware.js for why.
    const { language, source } = req.validated.body;

    // 1. Deterministic feature extraction (see imageFeature.service.js)
    const features = await extractFeatures(imagePath);

    // 2. Score (pure function, no I/O — see scoring.service.js)
    const scoreResult = computeScore(features);

    // 3. Explanation. This NEVER throws — a Sarvam failure resolves with
    // { fallback: true } instead, so it can never take down an otherwise
    // successful analysis. See sarvam.service.js.
    const explanation = await generateExplanation(features, scoreResult, language);

    // The URL is built from the request itself (protocol + host), not a
    // hardcoded env var, so it's correct whether this is hit via
    // localhost, a tunnel URL, or a real domain without reconfiguring.
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

    const processingTimeMs = Date.now() - startTime;

    // 4. Persist. Unlike step 3, a failure HERE should fail the request —
    // an analysis that can't be saved would silently vanish from history,
    // which is worse than a clear error telling the user to retry.
    const saved = await saveAnalysis({
      image: {
        url: imageUrl,
        width: features.imageMeta.width,
        height: features.imageMeta.height,
        format: features.imageMeta.format,
        sizeBytes: size,
        source,
      },
      features,
      scoreResult,
      explanation,
      processingTimeMs,
    });

    res.status(201).json({
      success: true,
      data: {
        id: saved.analysisId,
        createdAt: saved.createdAt,
        image: {
          url: imageUrl,
          width: features.imageMeta.width,
          height: features.imageMeta.height,
        },
        features: {
          brightness: features.brightness,
          edgeDensity: features.edgeDensity,
          textureScore: features.textureScore,
          colorHistogram: features.colorHistogram,
          particleEstimate: features.particleEstimate,
        },
        contaminationScore: scoreResult.contaminationScore,
        riskLevel: scoreResult.riskLevel,
        explanation,
        processingTimeMs,
      },
    });
  } catch (err) {
    // Orphaned-upload cleanup now happens centrally in
    // error.middleware.js — see that file for why. It handles this
    // controller's failures AND validation-rejected uploads, which
    // multer already saves to disk before validation ever runs.

    // AppErrors (e.g. a corrupt image, thrown by imageFeature.service.js)
    // already carry the right statusCode/code — pass them straight
    // through. Anything else reaching here (most likely the Neo4j save)
    // is an unexpected dependency failure, not something the client did
    // wrong.
    if (!err.isAppError) {
      err = AppError.serviceUnavailable(err.message || 'Analysis could not be completed.', 'ANALYSIS_FAILED');
    }

    next(err);
  }
}

/**
 * GET /api/v1/analysis/:id — a single analysis in full detail. Trivial by
 * design: all the real logic already lives in the repository.
 */
async function getAnalysis(req, res, next) {
  try {
    const analysis = await getAnalysisById(req.params.id);

    if (!analysis) {
      throw AppError.notFound(`No analysis found with id "${req.params.id}".`);
    }

    res.status(200).json({ success: true, data: analysis });
  } catch (err) {
    if (!err.isAppError) {
      err = AppError.serviceUnavailable(err.message || 'Could not retrieve analysis.', 'ANALYSIS_UNAVAILABLE');
    }
    next(err);
  }
}

module.exports = { createAnalysis, getAnalysis };
