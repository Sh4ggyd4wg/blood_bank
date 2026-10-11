
const { Pool, types } = require('pg');
const { ensureSetup, explainError } = require('./database');
const createApp = require('./app');

async function start() {
  const config = await ensureSetup();
  types.setTypeParser(1082, value => value); 
  const db = new Pool(config);
  const app = createApp(db, { waitDays: 56, secureCookies: false });
  const port = config.webPort;
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`\nOpen http://127.0.0.1:${port} in your browser.`);
    console.log('Press Control+C to stop.');
  });
  server.on('error', async error => {
    console.error(error.code === 'EADDRINUSE'
      ? `Port ${port} is already in use. Stop the other copy, or run npm run setup and choose another website port.`
      : error.message);
    await db.end();
    process.exitCode = 1;
  });
  function stop() {
    server.close(async () => { await db.end(); });
  }
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

start().catch(error => {
  console.error('\nCould not start:', explainError(error));
  process.exitCode = 1;
});
