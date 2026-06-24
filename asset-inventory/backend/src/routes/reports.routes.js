const { Router } = require('express');
const controller = require('../modules/reports/reports.controller');

const router = Router();

/**
 * @swagger
 * /api/reports/{sessionId}/located:
 *   get:
 *     summary: Lista los activos ubicados durante la sesion
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lista de activos ubicados con su informacion completa
 *       404:
 *         description: Sesion no encontrada
 */
router.get('/:sessionId/located', controller.getLocated);

/**
 * @swagger
 * /api/reports/{sessionId}/missing:
 *   get:
 *     summary: Lista los activos del batch que no fueron escaneados
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lista de activos pendientes de ubicar
 *       404:
 *         description: Sesion no encontrada
 */
router.get('/:sessionId/missing', controller.getMissing);

/**
 * @swagger
 * /api/reports/{sessionId}/external:
 *   get:
 *     summary: Lista los codigos escaneados que no pertenecen al batch
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lista de codigos externos escaneados
 *       404:
 *         description: Sesion no encontrada
 */
router.get('/:sessionId/external', controller.getExternal);

/**
 * @swagger
 * /api/reports/{sessionId}/stats:
 *   get:
 *     summary: Estadisticas generales del inventario de la sesion
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Totales y porcentaje de avance del inventario
 *       404:
 *         description: Sesion no encontrada
 */
router.get('/:sessionId/stats', controller.getStats);

module.exports = router;