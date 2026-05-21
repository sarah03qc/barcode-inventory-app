const inventoryService = require('./inventory.service');

// POST /api/inventory/sessions
async function createSession(req, res, next) {
  try {
    const session = await inventoryService.createSession(req.body);
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/sessions/:sessionId
async function getSession(req, res, next) {
  try {
    const session = await inventoryService.getSession(req.params.sessionId);
    res.json(session);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/inventory/sessions/:sessionId/close
async function closeSession(req, res, next) {
  try {
    const session = await inventoryService.closeSession(req.params.sessionId);
    res.json(session);
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/sessions/:sessionId/scans
async function registerScan(req, res, next) {
  try {
    const scan = await inventoryService.registerScan(
      req.params.sessionId,
      req.body.scanned_code
    );
    res.status(201).json(scan);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSession,
  getSession,
  closeSession,
  registerScan,
};