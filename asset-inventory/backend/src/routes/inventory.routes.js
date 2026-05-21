const express = require('express');
const router  = express.Router();
const inventoryController = require('../modules/inventory/inventory.controller');

// Gestion de sesiones
router.post('/sessions', inventoryController.createSession);
router.get('/sessions/:sessionId', inventoryController.getSession);
router.patch('/sessions/:sessionId/close', inventoryController.closeSession);

// Escaneos dentro de una sesion
router.post('/sessions/:sessionId/scans', inventoryController.registerScan);

module.exports = router;