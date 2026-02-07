const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  console.log(`MCA Portal server running on port ${config.port} (${config.env})`);
});

// Graceful shutdown
const shutdown = () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
