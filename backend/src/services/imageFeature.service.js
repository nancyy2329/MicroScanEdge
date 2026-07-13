// src/services/imageFeature.service.js
//
// Deterministic image feature extraction for water sample photos.
// Every value here comes from real pixel math — nothing here is a machine
// learning model, and nothing here is randomized. Same input image, same
// output features, always. That determinism is a deliberate design choice
// (see docs/architecture.md) — it's what makes the contamination score
// explainable and auditable rather than a black box.
//
// Five features are extracted:
//   - brightness        mean luminance, 0–1
//   - edgeDensity        fraction of pixels with a strong Laplacian response
//   - textureScore       variance of the Laplacian response ("variance of
//                        Laplacian" — a standard, well-documented blur/detail
//                        metric, not something invented for this project)
//   - colorHistogram     16-bucket-per-channel RGB distribution
//   - particleEstimate   count of contiguous high-contrast blobs, via a
//                        basic connected-components pass on a downsampled
//                        edge mask
//
// IMPORTANT — read this before trusting the numbers: this is a computer
// vision HEURISTIC, not a validated scientific instrument. It has not been
// calibrated against lab-confirmed microplastic counts (FTIR/Raman). The
// threshold and size constants below are reasonable starting points, not
// measured values — tune them against a small set of known clean vs.
// turbid reference photos before trusting the output for anything beyond
// a hackathon demo. See docs/architecture.md, section 6.

const sharp = require('sharp');
const AppError = require('../utils/AppError');

// ── Tunable constants ───────────────────────────────────────────────────────
// Working resolution for brightness/histogram/edge/texture — enough detail
// to be meaningful, small enough to process in well under a second even on
// a full-resolution phone camera photo.
const ANALYSIS_SIZE = 800;

// Much smaller resolution just for the particle-counting flood fill, since
// that pass is O(pixels) and doesn't benefit from full resolution — it's
// counting blobs, not measuring their exact boundaries.
const PARTICLE_ANALYSIS_SIZE = 200;

// A Laplacian response is centered at 128 (see laplacianResponse below). A
// pixel counts as an "edge" if it deviates from 128 by more than this.
const EDGE_THRESHOLD = 30;

// Same idea, used again independently for the particle mask — kept as a
// separate constant since "how sharp is an edge" and "how sharp is a
// particle boundary" are reasonable to tune separately later.
const PARTICLE_EDGE_THRESHOLD = 25;

// A connected blob smaller than this many pixels (at PARTICLE_ANALYSIS_SIZE
// resolution) is treated as noise, not a particle.
const MIN_PARTICLE_SIZE_PX = 3;

// Buckets per channel for the color histogram (256 / 16 = 16 bins/channel).
const HISTOGRAM_BUCKET_SIZE = 16;
const HISTOGRAM_BUCKETS = 256 / HISTOGRAM_BUCKET_SIZE;

/**
 * Confirms the file is actually a readable image before doing anything
 * else with it, so a corrupt upload fails with one clear error instead of
 * a confusing crash three steps into the pipeline.
 */
async function assertReadable(imagePath) {
  try {
    await sharp(imagePath).metadata();
  } catch (err) {
    throw AppError.unprocessable(`Could not read image file: ${err.message}`, 'UNPROCESSABLE_IMAGE');
  }
}

/**
 * Mean brightness (0–1) using standard luminance weighting. Resized first
 * so processing time stays bounded regardless of the input photo's
 * resolution.
 */
async function extractBrightness(imagePath) {
  const stats = await sharp(imagePath)
    .resize(ANALYSIS_SIZE, ANALYSIS_SIZE, { fit: 'inside', withoutEnlargement: true })
    .stats();

  const [r, g, b] = stats.channels;
  const brightness = (0.299 * r.mean + 0.587 * g.mean + 0.114 * b.mean) / 255;
  return Number(brightness.toFixed(4));
}

/**
 * 16-bucket-per-channel RGB histogram, computed from a resized raw buffer.
 */
async function extractColorHistogram(imagePath) {
  const { data, info } = await sharp(imagePath)
    .resize(ANALYSIS_SIZE, ANALYSIS_SIZE, { fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { channels } = info;
  const r = new Array(HISTOGRAM_BUCKETS).fill(0);
  const g = new Array(HISTOGRAM_BUCKETS).fill(0);
  const b = new Array(HISTOGRAM_BUCKETS).fill(0);

  for (let i = 0; i < data.length; i += channels) {
    r[Math.floor(data[i] / HISTOGRAM_BUCKET_SIZE)]++;
    g[Math.floor(data[i + 1] / HISTOGRAM_BUCKET_SIZE)]++;
    b[Math.floor(data[i + 2] / HISTOGRAM_BUCKET_SIZE)]++;
  }

  return { r, g, b };
}

/**
 * Applies a discrete Laplacian convolution — a standard edge-detection /
 * blur-metric kernel that responds strongly wherever pixel intensity
 * changes sharply, in any direction — and returns the raw single-channel
 * response buffer, centered at 128 so both directions of change are
 * visible in an unsigned 8-bit buffer without clipping.
 *
 * `.flatten()` before `.greyscale()` is load-bearing, not decorative: it
 * composites away any alpha channel onto a solid background BEFORE
 * greyscale conversion. Testing found that `.greyscale()` alone, on an
 * image with an alpha channel, produces a saturated/garbage convolution
 * result (every pixel pegged near 255) — `.removeAlpha()` does NOT fix
 * this (it just drops the channel without properly compositing), only
 * `.flatten()` does. This matters beyond synthetic test images: some
 * real-world photos (edited screenshots, some PNG exports) do carry an
 * alpha channel, so this has to be handled unconditionally, not assumed
 * away because "camera photos don't usually have alpha."
 */
async function laplacianResponse(imagePath, size) {
  return sharp(imagePath)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .greyscale()
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .convolve({
      width: 3,
      height: 3,
      kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
      scale: 1,
      offset: 128,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
}

/**
 * edgeDensity: fraction of pixels with a strong Laplacian response.
 * textureScore: variance of the (centered) Laplacian response — the
 * classic "variance of Laplacian" metric; a sharp, detailed image has high
 * variance, a smooth/blurry one has low variance. Both come from the same
 * convolution pass, computed in two passes for numerically stable variance.
 */
function computeEdgeAndTexture(laplacianBuffer) {
  const n = laplacianBuffer.length;
  let edgeCount = 0;
  let sum = 0;

  for (let i = 0; i < n; i++) {
    const deviation = laplacianBuffer[i] - 128;
    if (Math.abs(deviation) > EDGE_THRESHOLD) edgeCount++;
    sum += deviation;
  }

  const mean = sum / n;
  let sumSquaredDeviation = 0;
  for (let i = 0; i < n; i++) {
    const deviation = laplacianBuffer[i] - 128 - mean;
    sumSquaredDeviation += deviation * deviation;
  }
  const variance = sumSquaredDeviation / n;

  return {
    edgeDensity: Number((edgeCount / n).toFixed(4)),
    textureVariance: Number(variance.toFixed(2)),
  };
}

/**
 * Rough particle count: thresholds the (smaller, PARTICLE_ANALYSIS_SIZE)
 * Laplacian response into a binary edge mask, then runs 4-connectivity
 * flood fill to count contiguous blobs above a minimum size. This is a
 * genuine, if basic, computer vision technique — but it's a PROXY for
 * particle presence, not a substitute for real blob/contour detection
 * (OpenCV) or a trained classifier. See the file-level note at the top.
 */
function countParticles(laplacianBuffer, width, height) {
  const isEdge = new Uint8Array(laplacianBuffer.length);
  for (let i = 0; i < laplacianBuffer.length; i++) {
    isEdge[i] = Math.abs(laplacianBuffer[i] - 128) > PARTICLE_EDGE_THRESHOLD ? 1 : 0;
  }

  const visited = new Uint8Array(isEdge.length);
  let particleCount = 0;

  for (let start = 0; start < isEdge.length; start++) {
    if (!isEdge[start] || visited[start]) continue;

    // BFS flood fill over 4-connected neighbors.
    const queue = [start];
    visited[start] = 1;
    let blobSize = 0;

    while (queue.length > 0) {
      const idx = queue.pop();
      blobSize++;

      const x = idx % width;
      const y = Math.floor(idx / width);

      const neighbors = [
        x > 0 ? idx - 1 : -1,
        x < width - 1 ? idx + 1 : -1,
        y > 0 ? idx - width : -1,
        y < height - 1 ? idx + width : -1,
      ];

      for (const neighborIdx of neighbors) {
        if (neighborIdx >= 0 && isEdge[neighborIdx] && !visited[neighborIdx]) {
          visited[neighborIdx] = 1;
          queue.push(neighborIdx);
        }
      }
    }

    if (blobSize >= MIN_PARTICLE_SIZE_PX) particleCount++;
  }

  return particleCount;
}

/**
 * Runs the full deterministic feature-extraction pipeline against a single
 * image file on disk. This is the only function this module exports —
 * everything above is a private step in the pipeline.
 *
 * Note on performance: this decodes the source file independently for each
 * metric (4 separate sharp pipelines) rather than sharing one decode pass.
 * That's a deliberate readability-over-micro-optimization choice for a
 * per-request pipeline — worth revisiting only if this ever needs to run
 * at high throughput.
 *
 * @param {string} imagePath - absolute path to the saved upload (from multer)
 * @returns {Promise<object>} feature vector, ready for scoring.service.js
 */
async function extractFeatures(imagePath) {
  await assertReadable(imagePath);
  const metadata = await sharp(imagePath).metadata();

  const [brightness, colorHistogram, analysisResult, particleResult] = await Promise.all([
    extractBrightness(imagePath),
    extractColorHistogram(imagePath),
    laplacianResponse(imagePath, ANALYSIS_SIZE),
    laplacianResponse(imagePath, PARTICLE_ANALYSIS_SIZE),
  ]);

  const { edgeDensity, textureVariance } = computeEdgeAndTexture(analysisResult.data);
  const particleEstimate = countParticles(particleResult.data, particleResult.info.width, particleResult.info.height);

  return {
    brightness,
    edgeDensity,
    textureScore: textureVariance,
    colorHistogram,
    particleEstimate,
    imageMeta: {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    },
  };
}

module.exports = { extractFeatures };
