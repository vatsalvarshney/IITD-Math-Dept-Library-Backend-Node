const User = require('../models/user');
const BorrowRecord = require('../models/borrowRecord');
const { ROLES } = require('../config/constants');

/**
 * Get all students
 * @route GET /api/users/students
 * @access Staff only
 */
exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: ROLES.STUDENT })
      .select('_id username email first_name last_name role')
      .sort('username');

    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Server error when fetching students' });
  }
};

/**
 * Get user profile details
 * @route GET /api/users/:username/profile
 * @access Authenticated (own profile or staff)
 */
exports.getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    
    // Check if user has permission to view this profile
    if (req.user.username !== username && req.user.role !== ROLES.STAFF) {
      return res.status(403).json({
        message: 'You do not have permission to view this profile'
      });
    }
    
    const user = await User.findOne({ username })
      .select('_id username email first_name last_name role');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error when fetching user profile' });
  }
};

/**
 * Get user borrowing history
 * @route GET /api/users/:username/borrow-history
 * @access Authenticated (own history or staff)
 */
exports.getUserBorrowHistory = async (req, res) => {
  try {
    const { username } = req.params;
    
    // Check if user has permission to view this history
    if (req.user.username !== username && req.user.role !== ROLES.STAFF) {
      return res.status(403).json({
        message: 'You do not have permission to view this history'
      });
    }
    
    // Find the user first
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Fetch borrow records and populate book details
    const borrowRecords = await BorrowRecord.find({ student: user._id })
      .populate({
        path: 'book',
        select: '_id title author'
      })
      .populate({
        path: 'student',
        select: 'username first_name last_name'
      })
      .sort('-issued_at');
    
    // Transform data to match the serializer format from Django
    const formattedRecords = borrowRecords.map(record => {
      return {
        id: record._id,
        book: {
          id: record.book._id,
          title: record.book.title,
          author: record.book.author
        },
        issued_at: record.issued_at,
        due_at: record.due_at,
        returned_at: record.returned_at,
        status: record.status,
        is_overdue: record.is_overdue,
        student_name: `${record.student.first_name} ${record.student.last_name}`,
        student_username: record.student.username,
        book_title: record.book.title
      };
    });
    
    res.json(formattedRecords);
  } catch (error) {
    console.error('Error fetching borrow history:', error);
    res.status(500).json({ error: 'Server error when fetching borrow history' });
  }
};