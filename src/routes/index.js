const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const bookRoutes = require('./bookRoutes');
const tagRoutes = require('./tagRoutes');
const userRoutes = require('./userRoutes');
const staffRoutes = require('./staffRoutes');
const exportRoutes = require('./exportRoutes');
const uploadRoutes = require('./uploadRoutes');

// Apply routes
router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/tags', tagRoutes);
router.use('/users', userRoutes);
router.use('/staff', staffRoutes);
router.use('/export', exportRoutes);
router.use('/upload', uploadRoutes);
module.exports = router;