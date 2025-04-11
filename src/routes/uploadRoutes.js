// src/routes/upload.js
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../config/constants');

// Route for uploading CSV - protected by admin middleware
router.post('/books/csv', authenticate, authorize(ROLES.STAFF), uploadController.uploadBooks);

module.exports = router;