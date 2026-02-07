const express = require('express');
const healthRoutes = require('./health.routes');
const feesRoutes = require('./fees.routes');

const router = express.Router();

// Mount route modules
router.use('/health', healthRoutes);
router.use('/fees', feesRoutes);

// Add more route modules here, e.g.:
// router.use('/users', userRoutes);
// router.use('/auth', authRoutes);

module.exports = router;
