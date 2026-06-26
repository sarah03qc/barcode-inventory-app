module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  testTimeout: 15000,
  // corre todos los tests de un mismo archivo en serie, importante para
  // los repository tests que comparten la misma base de datos de prueba
  maxWorkers: 1,
  forceExit: true,
};