// src/controllers/uploadController.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Book = require('../models/book');
const Tag = require('../models/tag');
const multer = require('multer');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `books-${Date.now()}-${file.originalname}`);
  }
});

// Filter to only accept CSV files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('booksCsv');

// Helper function to process tags
const processTagString = (tagString) => {
  if (!tagString) return [];
  
  // Split by comma or semicolon
  return tagString
    .split(/[,;\/]/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
};

// Helper function to find or create tags
const findOrCreateTags = async (tagNames) => {
  const tagIds = [];
  
  for (const name of tagNames) {
    if (!name) continue;
    
    // Case-insensitive search
    let tag = await Tag.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    
    if (!tag) {
      // Create new tag if it doesn't exist
      tag = await Tag.create({ name });
    }
    
    tagIds.push(tag._id);
  }
  
  return tagIds;
};

// Main upload controller
exports.uploadBooks = async (req, res) => {
  upload(req, res, async function(err) {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message || 'Error uploading file' 
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload a CSV file' 
      });
    }
    
    const results = {
      totalProcessed: 0,
      added: 0,
      skipped: 0,
      errors: []
    };
    
    const processRows = [];
    
    // First pass to parse the CSV
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        // Map CSV columns to database fields
        const mappedRow = {
          isbn: row['ISBN (don\'t fill this)'] || '',
          title: row['Title'] || '',
          author: row['Author(s)'] || '',
          tagString: row['Topics (eg Linear Algebra, Calculus etc. Multiple topics allowed)'] || '',
          total_quantity: parseInt(row['Total Quantity'], 10) || 0,
          shelf: row['Shelf Number'] || '',
          rack: row['Rack Number'] || ''
        };
        
        // Skip rows with empty title
        if (!mappedRow.title.trim()) {
          return;
        }
        
        processRows.push(mappedRow);
      })
      .on('end', async () => {
        // Delete the uploaded file after processing
        fs.unlinkSync(req.file.path);
        
        try {
          // Process each row
          for (const row of processRows) {
            results.totalProcessed++;
            
            try {
              // Check if the book already exists by title and author (case insensitive)
              const existingBook = await Book.findOne({
                title: { $regex: new RegExp(`^${row.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                author: { $regex: new RegExp(`^${row.author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
              });
              
              if (existingBook) {
                results.skipped++;
                continue;
              }
              
              // Process tags
              const tagNames = processTagString(row.tagString);
              const tagIds = await findOrCreateTags(tagNames);
              
              // Create new book
              await Book.create({
                isbn: row.isbn,
                title: row.title,
                author: row.author,
                tags: tagIds,
                total_quantity: row.total_quantity,
                issued_quantity: 0, // Set default for new books
                shelf: row.shelf,
                rack: row.rack
              });
              
              results.added++;
            } catch (error) {
              results.errors.push({
                row: results.totalProcessed,
                title: row.title,
                error: error.message
              });
            }
          }
          
          return res.status(200).json({
            success: true,
            message: `Processed ${results.totalProcessed} books: ${results.added} added, ${results.skipped} already existed`,
            errors: results.errors.length > 0 ? results.errors : undefined
          });
        } catch (error) {
          console.error('Processing error:', error);
          return res.status(500).json({
            success: false,
            message: 'Error processing CSV file',
            error: error.message
          });
        }
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error parsing CSV file',
          error: error.message
        });
      });
  });
};