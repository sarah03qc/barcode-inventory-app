const express = require('express');
const assetsRoutes = require('./src/routes/assets.routes');
const errorHandler = require('./src/shared/middleware/errorHandler');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const swaggerUi   = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

// monta la UI en /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/assets', assetsRoutes);

const inventoryRoutes = require('./src/routes/inventory.routes');
app.use('/api/inventory', inventoryRoutes);

app.use('/scanner', express.static(path.join(__dirname, 'src/scanner')));

// debe ir al final, después de todas las rutas
app.use(errorHandler);

module.exports = app;
