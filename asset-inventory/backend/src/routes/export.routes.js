const { Router } = require('express');
const controller = require('../modules/export/export.controller');

const router = Router();

/**
 * @swagger
 * /api/export/{sessionId}/excel:
 *   get:
 *     summary: Exporta los resultados de una sesion a un archivo Excel
 *     description: >
 *       Genera un .xlsx con 4 hojas - Resumen, Ubicados, Externos y No Ubicados.
 *       Cada activo ubicado muestra tanto el custodio/ubicacion de ESTA sesion
 *       como la trazabilidad real mas reciente del activo (que puede diferir
 *       si fue escaneado de nuevo despues en otra sesion).
 *     tags: [Export]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Archivo Excel generado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Sesion no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:sessionId/excel', controller.exportExcel);

module.exports = router;