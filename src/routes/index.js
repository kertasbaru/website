const express = require('express');
const router = express.Router();

// Import Sub-Routers
const authRoutes = require('./auth.routes');
const profileRoutes = require('./profile.routes');
const paymentRoutes = require('./payment.routes');
const servicesRoutes = require('./services.routes');
const historyRoutes = require('./history.routes');
const adminRoutes = require('./admin.routes');

// Gunakan Sub-Routers
router.use('/', authRoutes);
router.use('/', profileRoutes);
router.use('/', paymentRoutes);
router.use('/', servicesRoutes);
router.use('/', historyRoutes);
router.use('/', adminRoutes);

module.exports = router;
