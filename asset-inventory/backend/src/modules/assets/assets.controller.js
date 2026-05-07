const service = require('./assets.service');

// POST /api/assets/upload
async function uploadAssets(req, res, next) {
  try {
    if (!req.file) {
      return next(Object.assign(new Error('No file provided'), { statusCode: 400 }));
    }
    const batch = await service.uploadAssets(req.file);
    return res.status(201).json(batch);
  } catch (err) {
    next(err);
  }
}

// GET /api/assets/:batchId
async function getAssetsByBatch(req, res, next) {
  try {
    const assets = await service.getAssetsByBatch(req.params.batchId);
    return res.json(assets);
  } catch (err) {
    next(err);
  }
}

// GET /api/assets/:batchId/assets/:assetNumber
async function findAsset(req, res, next) {
  try {
    const asset = await service.findAsset(req.params.assetNumber, req.params.batchId);
    return res.json(asset);
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadAssets, getAssetsByBatch, findAsset };
