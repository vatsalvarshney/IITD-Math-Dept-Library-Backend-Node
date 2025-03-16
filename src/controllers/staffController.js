const Book = require('../models/book');
const BorrowRecord = require('../models/borrowRecord');
const User = require('../models/user');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get total number of books
    const totalBooks = await Book.countDocuments();
    
    // Get number of books with at least one copy issued
    const issuedBooks = await Book.countDocuments({ issued_quantity: { $gt: 0 } });
    
    // Get number of overdue borrow records
    const overdueBooks = await BorrowRecord.countDocuments({
      status: 'issued',
      due_at: { $lt: new Date() }
    });
    
    return res.status(200).json({
      total_books: totalBooks,
      issued_books: issuedBooks,
      overdue_books: overdueBooks
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
};

// Get books list with current borrowers for staff
exports.getStaffBooksList = async (req, res) => {
  try {
    const query = req.query.q || '';
    const statusFilter = req.query.status || '';
    
    // Start with base query
    let bookQuery = {};
    
    // Add search criteria if provided
    if (query) {
      bookQuery = {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { author: { $regex: query, $options: 'i' } },
          { isbn: { $regex: query, $options: 'i' } }
        ]
      };
    }
    
    // Add status filter if provided
    if (statusFilter === 'issued') {
      bookQuery.issued_quantity = { $gt: 0 };
    }
    
    // For 'overdue' we need to handle differently because it requires a join
    let books;
    if (statusFilter === 'overdue') {
      // Find all overdue borrow records
      const overdueRecords = await BorrowRecord.find({
        status: 'issued',
        due_at: { $lt: new Date() }
      }).distinct('book');
      
      // Add book ids to query
      bookQuery._id = { $in: overdueRecords };
    }
    
    // Get books with populate
    books = await Book.find(bookQuery)
      .populate({
        path: 'tags',
        select: 'id name'
      });
    
    // Get current borrowers for each book
    const booksWithBorrowers = await Promise.all(books.map(async (book) => {
      const bookObj = book.toObject({ virtuals: true });
      
      // Get current borrowers
      const borrowRecords = await BorrowRecord.find({
        book: book._id,
        status: 'issued'
      }).populate({
        path: 'student',
        select: 'username first_name last_name'
      });
      
      // Format borrow records
      bookObj.borrow_records = borrowRecords.map(record => {
        const recordObj = record.toObject({ virtuals: true });
        return {
          id: recordObj._id,
          book: {
            id: book._id,
            title: book.title,
            author: book.author
          },
          issued_at: recordObj.issued_at,
          due_at: recordObj.due_at,
          returned_at: recordObj.returned_at,
          status: recordObj.status,
          is_overdue: recordObj.is_overdue,
          student_name: `${record.student.first_name} ${record.student.last_name}`,
          student_username: record.student.username,
          book_title: book.title
        };
      });
      
      return bookObj;
    }));
    
    return res.status(200).json(booksWithBorrowers);
  } catch (error) {
    console.error('Error getting staff books list:', error);
    return res.status(500).json({ error: 'Failed to get books list' });
  }
};

// Issue a book to a student
exports.issueBook = async (req, res) => {
  try {
    const { book_id, student } = req.body;
    
    // Validate input
    if (!book_id || !student) {
      return res.status(400).json({ error: 'Book ID and student username are required' });
    }
    
    // Find book
    const book = await Book.findById(book_id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    // Check if book is available
    if (book.available_quantity <= 0) {
      return res.status(400).json({ error: 'Book not available' });
    }
    
    // Find student
    const studentUser = await User.findOne({ username: student, role: 'student' });
    if (!studentUser) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Create borrow record
    const borrowRecord = new BorrowRecord({
      student: studentUser._id,
      book: book._id,
      status: 'issued'
    });
    
    await borrowRecord.save();
    
    // Populate the record for response
    await borrowRecord.populate([
      { path: 'student', select: 'username first_name last_name' },
      { path: 'book', select: 'id title author' }
    ]);
    
    // Format response
    const response = {
      id: borrowRecord._id,
      book: {
        id: book._id,
        title: book.title,
        author: book.author
      },
      issued_at: borrowRecord.issued_at,
      due_at: borrowRecord.due_at,
      returned_at: borrowRecord.returned_at,
      status: borrowRecord.status,
      is_overdue: borrowRecord.is_overdue,
      student_name: `${studentUser.first_name} ${studentUser.last_name}`,
      student_username: studentUser.username,
      book_title: book.title
    };
    
    return res.status(201).json(response);
  } catch (error) {
    console.error('Error issuing book:', error);
    return res.status(500).json({ error: 'Failed to issue book' });
  }
};

// Return a book
exports.returnBook = async (req, res) => {
  try {
    const { borrow_id } = req.params;
    
    // Find borrow record
    const borrowRecord = await BorrowRecord.findOne({
      _id: borrow_id,
      status: 'issued'
    });
    
    if (!borrowRecord) {
      return res.status(404).json({ error: 'Invalid borrow record ID' });
    }
    
    // Use the returnBook method from the model
    await borrowRecord.returnBook();
    
    // Populate the record for response
    await borrowRecord.populate([
      { path: 'student', select: 'username first_name last_name' },
      { path: 'book', select: 'id title author' }
    ]);
    
    // Format response
    const response = {
      id: borrowRecord._id,
      book: {
        id: borrowRecord.book._id,
        title: borrowRecord.book.title,
        author: borrowRecord.book.author
      },
      issued_at: borrowRecord.issued_at,
      due_at: borrowRecord.due_at,
      returned_at: borrowRecord.returned_at,
      status: borrowRecord.status,
      is_overdue: borrowRecord.is_overdue,
      student_name: `${borrowRecord.student.first_name} ${borrowRecord.student.last_name}`,
      student_username: borrowRecord.student.username,
      book_title: borrowRecord.book.title
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error returning book:', error);
    return res.status(500).json({ error: 'Failed to return book' });
  }
};