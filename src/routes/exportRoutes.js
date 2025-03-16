const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { ROLES } = require('../config/constants');


// Export routes - Only accessible by staff
router.get(
  '/books',
  authenticate,
  authorize(ROLES.STAFF),
  exportController.exportBooks
);

router.get(
  '/books/detailed',
  authenticate,
  authorize(ROLES.STAFF), 
  exportController.exportDetailed
);

module.exports = router;