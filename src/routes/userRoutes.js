const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../config/constants');

// Get all students (staff only)
router.get('/students', authenticate, authorize(ROLES.STAFF), userController.getAllStudents);

// Get user profile
router.get('/:username/profile', authenticate, userController.getUserProfile);

// Get user's borrowing history
router.get('/:username/borrow-history', authenticate, userController.getUserBorrowHistory);

module.exports = router;