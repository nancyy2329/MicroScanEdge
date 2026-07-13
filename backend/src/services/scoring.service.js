// src/services/scoring.service.js
//
// Turns a raw feature vector (from imageFeature.service.js) into a single
// contaminationScore (0-100) and a riskLevel label. This is a deliberately
// SEPARATE module from feature extraction — see docs/architecture.md,
// section 10 — so the scoring formula (or eventually a trained model) can
// be swapped out later without touching how features are measured.
//
// IMPORTANT: the weights and calibration constants below are reasonable
// STARTING POINTS, informed by a synthetic test image (~250 planted
// specks on a 600x600 photo produced edgeDensity 0.03, textureScore 255,
// particleEstimate 230) — NOT calibrated against real, lab-validated
// microplastic samples. Tune the *_CALIBRATION_MAX constants against your
// own known clean vs. turbid reference photos before trusting the
// absolute score for anything beyond a demo. The RELATIVE ordering (more
// visible debris -> higher score) is the part you can trust today.

// "How high a raw feature value counts as maximum contamination signal on
// that dimension." Values above this clamp to 1.0 (full signal).
const EDGE_CALIBRATION_MAX = 0.08;
const TEXTURE_CALIBRATION_MAX = 500;
const PARTICLE_CALIBRATION_MAX = 350;

// Must match imageFeature.service.js's HISTOGRAM_BUCKETS (16).
const HISTOGRAM_ENTROPY_MAX_BITS = Math.log2(16);

const WEIGHTS = {
  particles: 0.35,
  edges: 0.3,
  texture: 0.2,
  colorSpread: 0.15,
};

const RISK_BANDS = [
  { max: 24, level: 'LOW' },
  { max: 49, level: 'MODERATE' },
  { max: 74, level: 'HIGH' },
  { max: 100, level: 'CRITICAL' },
];

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Shannon entropy of one channel's histogram, normalized to 0-1 against
 * the maximum possible entropy for the bucket count. Higher = more
 * varied / spread-out color distribution in that channel; 0 = every
 * pixel landed in exactly one bucket (perfectly uniform).
 */
function channelEntropy(buckets) {
  const total = buckets.reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;

  let entropyBits = 0;
  for (const count of buckets) {
    if (count === 0) continue;
    const p = count / total;
    entropyBits -= p * Math.log2(p);
  }

  return entropyBits / HISTOGRAM_ENTROPY_MAX_BITS;
}

/**
 * Color "spread" signal: average entropy across R, G, B channels. A
 * near-uniform sample (clean water, narrow color range) scores low; a
 * sample with scattered dark/light/discolored particles scores higher.
 * Self-contained on purpose — no external "clean water" reference image
 * required, unlike a direct histogram-comparison approach would need.
 */
function colorSpread(colorHistogram) {
  const { r, g, b } = colorHistogram;
  return (channelEntropy(r) + channelEntropy(g) + channelEntropy(b)) / 3;
}

function riskLevelFor(score) {
  return RISK_BANDS.find((band) => score <= band.max).level;
}

/**
 * @param {object} features - output of imageFeature.service.js's extractFeatures()
 * @returns {{ contaminationScore: number, riskLevel: string, breakdown: object }}
 */
function computeScore(features) {
  const normalizedEdge = clamp01(features.edgeDensity / EDGE_CALIBRATION_MAX);
  const normalizedTexture = clamp01(features.textureScore / TEXTURE_CALIBRATION_MAX);
  const normalizedParticles = clamp01(features.particleEstimate / PARTICLE_CALIBRATION_MAX);
  const normalizedColorSpread = colorSpread(features.colorHistogram);

  const weightedSum =
    WEIGHTS.particles * normalizedParticles +
    WEIGHTS.edges * normalizedEdge +
    WEIGHTS.texture * normalizedTexture +
    WEIGHTS.colorSpread * normalizedColorSpread;

  // clamp01 here is a second, defensive safety net — weightedSum is already
  // mathematically bounded to [0,1] since every term is a clamped value
  // times a weight, and the weights sum to 1. Kept anyway: cheap insurance
  // against a future weights edit that doesn't sum to exactly 1.
  const contaminationScore = Math.round(clamp01(weightedSum) * 100);

  return {
    contaminationScore,
    riskLevel: riskLevelFor(contaminationScore),
    breakdown: {
      normalizedEdge: Number(normalizedEdge.toFixed(3)),
      normalizedTexture: Number(normalizedTexture.toFixed(3)),
      normalizedParticles: Number(normalizedParticles.toFixed(3)),
      normalizedColorSpread: Number(normalizedColorSpread.toFixed(3)),
      weights: { ...WEIGHTS },
    },
  };
}

module.exports = { computeScore, riskLevelFor };
