const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// Login route
router.post('/login', authController.login);

// Refresh token route
router.post('/token/refresh', authController.refreshToken);

// Validate token route
router.post('/validate', authenticate, authController.validateToken);

module.exports = router;