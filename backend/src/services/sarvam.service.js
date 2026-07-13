// src/services/sarvam.service.js
//
// Generates a human-readable explanation of an ALREADY-COMPUTED
// contamination analysis via Sarvam AI's chat completions endpoint.
//
// Sarvam never influences the contamination score — it only narrates a
// result that's already final by the time this is called (see
// scoring.service.js). That means a failure here should never fail the
// whole analysis: this function always RESOLVES, never rejects — on any
// failure, after retrying, it returns a clearly-marked fallback
// explanation instead of throwing. See docs/architecture.md, section 8.
//
// Endpoint/auth/model verified against Sarvam's current docs as of this
// build: POST {SARVAM_API_BASE_URL}/v1/chat/completions, auth via the
// api-subscription-key header, model sarvam-30b (sarvam-m is deprecated
// and being removed from the API). NOT tested against the live API — no
// credentials are available in this build environment. What IS tested
// here (against a local mock server matching the documented response
// shape): retry/backoff behavior, the non-retryable-vs-retryable
// distinction, the fallback path, and response parsing. Test against the
// real endpoint once you have a key — see the note at the end of this
// build for what to watch for.

const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = [500, 1500]; // delay before attempt 2, and before attempt 3

// Client-side errors a retry cannot fix — a bad key is still a bad key on
// attempt 2. Only worth retrying network errors, timeouts, and 5xx/429.
const NON_RETRYABLE_STATUS_CODES = [400, 401, 403, 404];

function buildMessages(features, scoreResult, language) {
  return [
    {
      role: 'system',
      content:
        'You are a water-quality assistant explaining an automated computer-vision analysis of a microscope photo of a water sample, inside a hackathon prototype app. You are given numeric measurements and a 0-100 contamination score already computed by simple weighted heuristics — this is NOT a lab test, NOT a certified measurement, and not your own visual judgment (you cannot see the image). ' +
        'Write a short, plain-language explanation (3-5 sentences) of what the measurements suggest, referencing the specific numbers you were given. Do not invent visual details you were not given. Do not claim scientific certainty. Do not state or imply whether the water is safe to drink — describe only what the visual measurements indicate about particulate/turbidity signal, and note this is a screening heuristic, not a lab result. Write for a general audience, in ' +
        (language || 'English') +
        '.',
    },
    {
      role: 'user',
      content: [
        `Contamination score: ${scoreResult.contaminationScore}/100 (risk level: ${scoreResult.riskLevel})`,
        `Estimated particle count: ${features.particleEstimate}`,
        `Edge density (fraction of high-contrast transitions): ${features.edgeDensity}`,
        `Texture variance: ${features.textureScore}`,
        `Brightness: ${features.brightness}`,
        `Color spread signal (0-1): ${scoreResult.breakdown.normalizedColorSpread}`,
        '',
        'Explain what this suggests about the water sample.',
      ].join('\n'),
    },
  ];
}

function isRetryable(err) {
  if (!err.response) return true; // network error / timeout — worth retrying
  return !NON_RETRYABLE_STATUS_CODES.includes(err.response.status);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fallbackExplanation(features, scoreResult) {
  return {
    text:
      `Automated explanation unavailable right now. Based on the computed score, this sample falls in the ` +
      `"${scoreResult.riskLevel}" risk band (${scoreResult.contaminationScore}/100), with an estimated ` +
      `${features.particleEstimate} visible particle-like features detected.`,
    language: 'English',
    modelUsed: null,
    fallback: true,
  };
}

/**
 * Requests a natural-language explanation of an already-computed analysis.
 * Retries transient failures with backoff; on final failure, RESOLVES
 * (does not reject) with a clearly-marked fallback explanation instead.
 *
 * @param {object} features - output of imageFeature.service.js
 * @param {object} scoreResult - output of scoring.service.js's computeScore()
 * @param {string} [language] - e.g. "English", "Hindi" — defaults to English
 * @returns {Promise<{text: string, language: string, modelUsed: string|null, fallback: boolean}>}
 */
async function generateExplanation(features, scoreResult, language) {
  const messages = buildMessages(features, scoreResult, language);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await axios.post(
        `${config.sarvam.baseUrl}/v1/chat/completions`,
        {
          model: config.sarvam.model,
          messages,
          max_tokens: 300,
          temperature: 0.4,
          reasoning_effort: 'low', // this is text narration, not a reasoning task — keep latency/cost down
        },
        {
          headers: {
            'api-subscription-key': config.sarvam.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const text = response.data?.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new Error('Sarvam AI response did not contain the expected choices[0].message.content field.');
      }

      return {
        text,
        language: language || 'English',
        modelUsed: config.sarvam.model,
        fallback: false,
      };
    } catch (err) {
      const attemptsRemaining = attempt < MAX_ATTEMPTS;
      const retryable = isRetryable(err);

      logger.warn('Sarvam AI request failed', {
        attempt,
        maxAttempts: MAX_ATTEMPTS,
        retryable,
        status: err.response ? err.response.status : undefined,
        error: err.response ? JSON.stringify(err.response.data) : err.message,
      });

      if (!retryable || !attemptsRemaining) {
        return fallbackExplanation(features, scoreResult);
      }

      await sleep(RETRY_DELAY_MS[attempt - 1]);
    }
  }

  // Unreachable — the loop above always returns on its last iteration.
  // Kept only so the function has an explicit, obvious final return.
  return fallbackExplanation(features, scoreResult);
}

module.exports = { generateExplanation };
