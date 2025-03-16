const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../config/constants');


// Apply authentication middleware to all staff routes
router.use(authenticate);
router.use(authorize(ROLES.STAFF));

// Dashboard stats
router.get('/dashboard/stats', staffController.getDashboardStats);

// Books list with borrowers
router.get('/books', staffController.getStaffBooksList);

// Issue book to student
router.post('/books/issue', staffController.issueBook);

// Return book
router.post('/books/return/:borrow_id', staffController.returnBook);

module.exports = router;