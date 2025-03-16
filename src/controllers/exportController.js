const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');
const { Book, BorrowRecord, User } = require('../models/index');

// Helper function to create temp directory if it doesn't exist
const ensureTempDir = () => {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

/**
 * Generate CSV with basic books data
 */
const generateBooksCSV = async () => {
  const tempDir = ensureTempDir();
  const filePath = path.join(tempDir, 'books.csv');
  
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'isbn', title: 'ISBN' },
      { id: 'title', title: 'Title' },
      { id: 'author', title: 'Author' },
      { id: 'total_quantity', title: 'Total Quantity' },
      { id: 'available_quantity', title: 'Available Quantity' },
      { id: 'tags', title: 'Tags' },
      { id: 'description', title: 'Description' },
      { id: 'shelf', title: 'Shelf' },
      { id: 'rack', title: 'Rack' }
    ]
  });
  
  // Fetch books with tags
  const books = await Book.find().populate('tags');
  
  // Format data for CSV
  const records = books.map(book => {
    const tags = book.tags.map(tag => tag.name).join(', ');
    
    return {
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      total_quantity: book.total_quantity,
      available_quantity: book.available_quantity,
      tags: tags,
      description: book.description || '',
      shelf: book.shelf || '',
      rack: book.rack || ''
    };
  });
  
  // Write to CSV
  await csvWriter.writeRecords(records);
  
  return filePath;
};

/**
 * Generate CSV with books and borrowing status
 */
const generateDetailedCSV = async () => {
  const tempDir = ensureTempDir();
  const filePath = path.join(tempDir, 'books_detailed.csv');
  
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'isbn', title: 'ISBN' },
      { id: 'title', title: 'Title' },
      { id: 'author', title: 'Author' },
      { id: 'total_quantity', title: 'Total Quantity' },
      { id: 'available_quantity', title: 'Available Quantity' },
      { id: 'current_borrowers', title: 'Current Borrowers' },
      { id: 'overdue_borrowers', title: 'Overdue Borrowers' },
      { id: 'tags', title: 'Tags' },
      { id: 'description', title: 'Description' },
      { id: 'shelf', title: 'Shelf' },
      { id: 'rack', title: 'Rack' }
    ]
  });
  
  // Fetch books with tags
  const books = await Book.find().populate('tags');
  
  // Prepare records for CSV
  const records = await Promise.all(books.map(async (book) => {
    // Get current borrow records for this book
    const currentBorrows = await BorrowRecord.find({
      book: book._id,
      status: 'issued'
    }).populate('student');
    
    // Format borrower info
    const borrowers = currentBorrows.map(record => {
      const student = record.student;
      return `${student.first_name} ${student.last_name} (${student.username})`;
    });
    
    // Get overdue borrowers
    const now = new Date();
    const overdueBorrowers = currentBorrows
      .filter(record => record.due_at < now)
      .map(record => {
        const student = record.student;
        return `${student.first_name} ${student.last_name} (${student.username})`;
      });
    
    // Format tags
    const tags = book.tags.map(tag => tag.name).join(', ');
    
    return {
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      total_quantity: book.total_quantity,
      available_quantity: book.available_quantity,
      current_borrowers: borrowers.length ? borrowers.join('; ') : 'None',
      overdue_borrowers: overdueBorrowers.length ? overdueBorrowers.join('; ') : 'None',
      tags: tags,
      description: book.description || '',
      shelf: book.shelf || '',
      rack: book.rack || ''
    };
  }));
  
  // Write to CSV
  await csvWriter.writeRecords(records);
  
  return filePath;
};

/**
 * Export basic books data as CSV
 */
exports.exportBooks = async (req, res) => {
  try {
    const filePath = await generateBooksCSV();
    
    // Set headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="books.csv"');
    
    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Clean up temp file after streaming
    fileStream.on('end', () => {
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('Error exporting books:', error);
    res.status(500).json({ error: 'Failed to export books' });
  }
};

/**
 * Export detailed books data with borrowing status as CSV
 */
exports.exportDetailed = async (req, res) => {
  try {
    const filePath = await generateDetailedCSV();
    
    // Set headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="books_detailed.csv"');
    
    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Clean up temp file after streaming
    fileStream.on('end', () => {
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('Error exporting detailed books:', error);
    res.status(500).json({ error: 'Failed to export detailed books data' });
  }
};