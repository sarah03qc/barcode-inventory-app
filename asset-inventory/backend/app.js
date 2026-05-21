const express = require('express');
const assetsRoutes = require('./src/routes/assets.routes');
const errorHandler = require('./src/shared/middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/assets', assetsRoutes);

const inventoryRoutes = require('./src/routes/inventory.routes');
app.use('/api/inventory', inventoryRoutes);

// debe ir al final, después de todas las rutas
app.use(errorHandler);

module.exports = app;
