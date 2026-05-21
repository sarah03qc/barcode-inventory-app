const express = require('express');
const router = express.Router();
const inventoryController = require('../modules/inventory/inventory.controller');

/**
 * @swagger
 * /api/inventory/sessions:
 *   post:
 *     summary: Crea una nueva sesion de inventario
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [location, custodian, upload_batch_id]
 *             properties:
 *               location:
 *                 type: string
 *                 example: Edificio TEC Piso 2
 *               custodian:
 *                 type: string
 *                 example: Rogelio Gonzalez
 *               upload_batch_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Sesion creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventorySession'
 *       400:
 *         description: Campos requeridos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Batch no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Batch no esta en estado done
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/sessions', inventoryController.createSession);

/**
 * @swagger
 * /api/inventory/sessions/{sessionId}:
 *   get:
 *     summary: Retorna el detalle de una sesion
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sesion encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventorySession'
 *       404:
 *         description: Sesion no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/sessions/:sessionId', inventoryController.getSession);

/**
 * @swagger
 * /api/inventory/sessions/{sessionId}/close:
 *   patch:
 *     summary: Cierra una sesion activa
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sesion cerrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventorySession'
 *       404:
 *         description: Sesion no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Sesion ya estaba cerrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/sessions/:sessionId/close', inventoryController.closeSession);

/**
 * @swagger
 * /api/inventory/sessions/{sessionId}/scans:
 *   post:
 *     summary: Registra un escaneo en la sesion
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scanned_code]
 *             properties:
 *               scanned_code:
 *                 type: string
 *                 example: 49823
 *     responses:
 *       201:
 *         description: Escaneo registrado. scan_type indica located, external o duplicate
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScanRecord'
 *       400:
 *         description: scanned_code faltante
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Sesion no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Sesion cerrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/sessions/:sessionId/scans', inventoryController.registerScan);

module.exports = router;