const { Router } = require('express');
const upload = require('../shared/middleware/upload');
const controller = require('../modules/assets/assets.controller');

const router = Router();

/**
 * @swagger
 * /api/assets/upload:
 *   post:
 *     summary: Sube un archivo Excel o CSV y crea un batch de activos
 *     tags: [Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Batch creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Batch'
 *       400:
 *         description: Archivo no proporcionado o formato invalido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Archivo sin registros validos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/upload', upload.single('file'), controller.uploadAssets);

/**
 * @swagger
 * /api/assets/{batchId}:
 *   get:
 *     summary: Retorna todos los activos de un batch
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lista de activos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Asset'
 */
router.get('/:batchId', controller.getAssetsByBatch);

/**
 * @swagger
 * /api/assets/{batchId}/assets/{assetNumber}:
 *   get:
 *     summary: Busca un activo especifico dentro de un batch
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: assetNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activo encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       404:
 *         description: Activo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:batchId/assets/:assetNumber', controller.findAsset);

module.exports = router;
