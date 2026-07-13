// src/controllers/history.controller.js
//
// GET /api/v1/history — the list view. A genuinely different concern
// from analysis.controller.js: this is about querying/paginating many
// records, not creating or reading one. All it does is delegate to the
// repository — validate.middleware.js (see history.routes.js) already
// guarantees req.query.limit/offset/minScore/maxScore are clean, coerced
// numbers within range by the time this runs.

const AppError = require('../utils/AppError');
const { getHistory } = require('../repositories/analysis.repository');

async function listHistory(req, res, next) {
  try {
    // Reads from req.validated.query, not req.query directly — see the
    // comment in validate.middleware.js for why (req.query is a
    // non-reassignable getter in Express 5).
    const { limit, offset, minScore, maxScore } = req.validated.query;
    const items = await getHistory({ limit, offset, minScore, maxScore });

    res.status(200).json({
      success: true,
      data: {
        items,
        limit,
        offset,
        // Simple "there might be another page" signal — a full page came
        // back. Not a guaranteed-exact count; good enough at this scale.
        // See docs/architecture.md section 10 for the cursor-based
        // upgrade path if this ever needs to scale further.
        hasMore: items.length === limit,
      },
    });
  } catch (err) {
    if (!err.isAppError) {
      err = AppError.serviceUnavailable(err.message || 'Could not retrieve history.', 'HISTORY_UNAVAILABLE');
    }
    next(err);
  }
}

module.exports = { listHistory };
