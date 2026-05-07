const env = require('./src/config/env');
const { testConnection } = require('./src/shared/db/connection');
const app = require('./app');

async function start() {
  await testConnection();
  app.listen(env.PORT, () => {
    console.log(`✓ Server running on port ${env.PORT}`);
  });
}

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
