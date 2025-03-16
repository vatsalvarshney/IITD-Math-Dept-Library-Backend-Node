const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../config/constants');

// Get all tags
router.get('/', tagController.getTags);

// Add a new tag (staff only)
router.post('/add', authenticate, authorize(ROLES.STAFF), tagController.addTag);

module.exports = router;