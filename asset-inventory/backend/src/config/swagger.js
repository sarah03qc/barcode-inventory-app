const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Asset Inventory API',
      version: '1.0.0',
      description: 'API para el sistema de inventario de activos mediante escaneo de codigo de barras',
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Servidor local' },
    ],
    components: {
      schemas: {
        Batch: {
          type: 'object',
          properties: {
            id:            { type: 'string', format: 'uuid' },
            filename:      { type: 'string' },
            total_records: { type: 'integer' },
            status:        { type: 'string', enum: ['pending', 'processing', 'done', 'error'] },
            uploaded_at:   { type: 'string', format: 'date-time' },
          },
        },
        Asset: {
          type: 'object',
          properties: {
            id:               { type: 'string', format: 'uuid' },
            asset_number:     { type: 'string' },
            description:      { type: 'string', nullable: true },
            responsible:      { type: 'string', nullable: true },
            functional_center:{ type: 'string', nullable: true },
            dependency:       { type: 'string', nullable: true },
            metadata:         { type: 'object', nullable: true },
            upload_batch_id:  { type: 'string', format: 'uuid' },
          },
        },
        InventorySession: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid' },
            location:        { type: 'string' },
            custodian:       { type: 'string' },
            status:          { type: 'string', enum: ['active', 'closed'] },
            upload_batch_id: { type: 'string', format: 'uuid' },
            started_at:      { type: 'string', format: 'date-time' },
            closed_at:       { type: 'string', format: 'date-time', nullable: true },
          },
        },
        ScanRecord: {
          type: 'object',
          properties: {
            id:           { type: 'string', format: 'uuid' },
            session_id:   { type: 'string', format: 'uuid' },
            scanned_code: { type: 'string' },
            asset_id:     { type: 'string', format: 'uuid', nullable: true },
            scan_type:    { type: 'string', enum: ['located', 'external', 'duplicate'] },
            scanned_at:   { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error:   { type: 'boolean' },
            message: { type: 'string' },
            status:  { type: 'integer' },
          },
        },
      },
    },
  },
  // lee los comentarios JSDoc de todos los archivos de rutas
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);