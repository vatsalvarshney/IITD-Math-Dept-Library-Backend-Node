const Book = require('../models/book');
const Tag = require('../models/tag');
const BorrowRecord = require('../models/borrowRecord');
const User = require('../models/user');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// GET /books (with search, filtering, and pagination)
exports.getBooks = async (req, res) => {
  try {
    const query = req.query.q || '';
    const tagIds = req.query.tags ? req.query.tags.split(',') : [];
    const availableOnly = req.query.available === 'true';
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 10;
    
    let dbQuery = {};
    
    // Search functionality
    if (query) {
      dbQuery = {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { author: { $regex: query, $options: 'i' } },
          { isbn: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      };
    }
    
    // Tag filtering
    if (tagIds.length > 0) {
      // Convert string IDs to ObjectId
      const objectIdTags = tagIds.map(id => new mongoose.Types.ObjectId(id));
      dbQuery.tags = { $in: objectIdTags };
    }
    
    // Available only filter: total_quantity > issued_quantity
    if (availableOnly) {
      // dbQuery.total_quantity = { $gt: '$issued_quantity' };
      dbQuery.$expr = { $gt: ['$total_quantity', '$issued_quantity'] };
    }
    
    // Count total matching documents
    const totalCount = await Book.countDocuments(dbQuery);
    const totalPages = Math.ceil(totalCount / perPage);
    
    // Get paginated results with tags populated
    let books;
    if (query) {
      // Apply complex sorting for search queries (sorted by relevance)
      // books = await Book.find(dbQuery)
      //   .populate('tags')
      //   .sort({ title: 1 }) // Simple sorting by title
      //   .skip((page - 1) * perPage)
      //   .limit(perPage);
      books = await Book.aggregate([
        { $match: dbQuery },
        { 
          $addFields: { 
            relevance: {
              $switch: {
                branches: [
                  { case: { $regexMatch: { input: "$title", regex: query, options: "i" } }, then: 4 },
                  { case: { $regexMatch: { input: "$author", regex: query, options: "i" } }, then: 3 },
                  { case: { $regexMatch: { input: "$isbn", regex: query, options: "i" } }, then: 2 },
                  { case: { $regexMatch: { input: "$description", regex: query, options: "i" } }, then: 1 }
                ],
                default: 0
              }
            }
          }
        },
        { $sort: { relevance: -1 } },  // Sort by relevance in descending order
        { $skip: (page - 1) * perPage },
        { $limit: perPage },
        { $lookup: { from: "tags", localField: "tags", foreignField: "_id", as: "tags" } }  // Equivalent to populate
      ]);
      
      books = books.map(doc => Book.hydrate(doc));
    } else {
      // Default sorting by title
      books = await Book.find(dbQuery)
        .populate('tags')
        .sort({ title: 1 })
        .skip((page - 1) * perPage)
        .limit(perPage);
    }
    
    return res.status(200).json({
      results: books,
      total_pages: totalPages,
      current_page: page,
      total_count: totalCount,
      has_next: page < totalPages,
      has_previous: page > 1
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /books/popular
exports.getPopularBooks = async (req, res) => {
  try {
    // Aggregate to count borrow records per book and sort by count
    const popularBooks = await BorrowRecord.aggregate([
      { $group: { _id: '$book', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);
    
    // Get book details for each popular book
    const bookIds = popularBooks.map(item => item._id);
    const books = await Book.find({ _id: { $in: bookIds } })
      .populate('tags');
    
    // Sort books by the original popularity order
    const sortedBooks = bookIds.map(id => 
      books.find(book => book._id.toString() === id.toString())
    ).filter(Boolean);
    
    return res.status(200).json(sortedBooks);
  } catch (error) {
    console.error('Error fetching popular books:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /books/new-arrivals
exports.getNewArrivals = async (req, res) => {
  try {
    const newArrivals = await Book.find()
      .populate('tags')
      .sort({ created_at: -1 })
      .limit(6);
    
    return res.status(200).json(newArrivals);
  } catch (error) {
    console.error('Error fetching new arrivals:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /books/:id
exports.getBookDetails = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('tags');
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    return res.status(200).json(book);
  } catch (error) {
    console.error('Error fetching book details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /books/:id/history (staff only)
exports.getBookBorrowHistory = async (req, res) => {
  try {
    // Check if book exists
    const bookExists = await Book.exists({ _id: req.params.id });
    if (!bookExists) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    // Fetch borrow records for this book
    const borrowRecords = await BorrowRecord.find({ book: req.params.id })
      .populate('student', 'username email first_name last_name role')
      .sort({ issued_at: -1 });
    
    return res.status(200).json(borrowRecords);
  } catch (error) {
    console.error('Error fetching book borrow history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /books/add (staff only)
exports.createBook = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { isbn, title, author, tags, total_quantity, description, shelf, rack } = req.body;
    
    // Check if ISBN already exists
    const existingBook = await Book.findOne({ isbn });
    if (existingBook) {
      return res.status(400).json({ error: 'A book with this ISBN already exists' });
    }
    
    // Create book
    const book = new Book({
      isbn,
      title,
      author,
      total_quantity: total_quantity || 0,
      issued_quantity: 0,
      description,
      shelf,
      rack
    });
    
    // Handle tags if provided
    if (tags && Array.isArray(tags)) {
      // Find existing tags by IDs
      const existingTags = await Tag.find({ _id: { $in: tags } });
      book.tags = existingTags.map(tag => tag._id);
    }
    
    await book.save();
    
    // Return with populated tags
    const savedBook = await Book.findById(book._id).populate('tags');
    return res.status(201).json(savedBook);
  } catch (error) {
    console.error('Error creating book:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /books/:id (staff only)
exports.updateBook = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const { isbn, title, author, tags, total_quantity, description, shelf, rack } = req.body;
    
    // Validate ISBN uniqueness if changed
    if (isbn && isbn !== book.isbn) {
      const existingBook = await Book.findOne({ isbn });
      if (existingBook && existingBook._id.toString() !== req.params.id) {
        return res.status(400).json({ error: 'A book with this ISBN already exists' });
      }
      book.isbn = isbn;
    }
    
    // Validate total_quantity
    if (total_quantity !== undefined) {
      if (total_quantity < 0) {
        return res.status(400).json({ error: 'Total quantity cannot be negative' });
      }
      if (total_quantity < book.issued_quantity) {
        return res.status(400).json({ 
          error: 'Total quantity cannot be less than currently issued quantity' 
        });
      }
      book.total_quantity = total_quantity;
    }
    
    // Update other fields if provided
    if (title) book.title = title;
    if (author) book.author = author;
    if (description !== undefined) book.description = description;
    if (shelf !== undefined) book.shelf = shelf;
    if (rack !== undefined) book.rack = rack;
    
    // Handle tags if provided
    if (tags && Array.isArray(tags)) {
      // Find existing tags by IDs
      const existingTags = await Tag.find({ _id: { $in: tags } });
      book.tags = existingTags.map(tag => tag._id);
    }
    
    await book.save();
    
    // Return with populated tags
    const updatedBook = await Book.findById(book._id).populate('tags');
    return res.status(200).json(updatedBook);
  } catch (error) {
    console.error('Error updating book:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /books/:id (staff only)
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    // Check if book has active borrow records
    // const activeBorrows = await BorrowRecord.countDocuments({ 
    //   book: req.params.id, 
    //   status: 'issued' 
    // });
    
    // if (activeBorrows > 0) {
    //   return res.status(400).json({ 
    //     error: 'Cannot delete book with active borrow records' 
    //   });
    // }

    // delete all borrow records for this book
    await BorrowRecord.deleteMany({ book: req.params.id });
    
    await book.deleteOne();
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting book:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};