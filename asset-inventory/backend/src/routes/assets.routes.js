const { Router } = require('express');
const upload = require('../shared/middleware/upload');
const controller = require('../modules/assets/assets.controller');

const router = Router();

router.post('/upload', upload.single('file'), controller.uploadAssets);
router.get('/:batchId', controller.getAssetsByBatch);
router.get('/:batchId/assets/:assetNumber', controller.findAsset);

module.exports = router;
