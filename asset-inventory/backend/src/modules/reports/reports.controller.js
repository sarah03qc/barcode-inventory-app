const service = require('./reports.service');

// GET /api/reports/:sessionId/located
async function getLocated(req, res, next) {
  try {
    const report = await service.getLocatedReport(req.params.sessionId);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/:sessionId/missing
async function getMissing(req, res, next) {
  try {
    const report = await service.getMissingReport(req.params.sessionId);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/:sessionId/external
async function getExternal(req, res, next) {
  try {
    const report = await service.getExternalReport(req.params.sessionId);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/:sessionId/stats
async function getStats(req, res, next) {
  try {
    const stats = await service.getStats(req.params.sessionId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

module.exports = { getLocated, getMissing, getExternal, getStats };