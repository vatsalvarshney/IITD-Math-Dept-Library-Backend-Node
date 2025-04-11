const express = require('express');
const { check } = require('express-validator');
const bookController = require('../controllers/bookController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const router = express.Router();
const { ROLES } = require('../config/constants');

// Book list with search and filtering
router.get('/', bookController.getBooks);

// Popular books
router.get('/popular', bookController.getPopularBooks);

// New arrivals
router.get('/new-arrivals', bookController.getNewArrivals);

// Book details
router.get('/:id', bookController.getBookDetails);

// Book borrow history (staff only)
router.get(
  '/:id/history',
  authenticate,
  authorize(ROLES.STAFF),
  bookController.getBookBorrowHistory
);

// Create book (staff only)
router.post(
  '/add',
  [
    authenticate,
    authorize(ROLES.STAFF),
    check('isbn').isLength({ max: 20 }).withMessage('ISBN too long'),
    check('title').notEmpty().withMessage('Title is required'),
    check('author').notEmpty().withMessage('Author is required'),
    check('total_quantity').isInt({ min: 0 }).withMessage('Total quantity must be a non-negative integer')
  ],
  bookController.createBook
);

// Update book (staff only)
router.put(
  '/:id/update',
  [
    authenticate,
    authorize(ROLES.STAFF),
    check('isbn').optional().isLength({ max: 20 }).withMessage('ISBN too long'),
    check('title').optional().notEmpty().withMessage('Title cannot be empty'),
    check('author').optional().notEmpty().withMessage('Author cannot be empty'),
    check('total_quantity').optional().isInt({ min: 0 }).withMessage('Total quantity must be a non-negative integer')
  ],
  bookController.updateBook
);

// Delete book (staff only)
router.delete(
  '/:id/delete',
  authenticate,
  authorize(ROLES.STAFF),
  bookController.deleteBook
);

module.exports = router;