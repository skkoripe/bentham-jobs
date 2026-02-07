const config = require('../config');

/**
 * GET /api/v1/health - Health check endpoint
 */
const getHealth = (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.env,
    uptime: process.uptime(),
  });
};

module.exports = {
  getHealth,
};
