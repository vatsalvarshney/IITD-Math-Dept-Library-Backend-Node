const mongoose = require('mongoose');
const { DEFAULT_BORROW_DURATION } = require('../config/constants');

// Function to calculate due date
const getDueDate = () => {
  return new Date(Date.now() + DEFAULT_BORROW_DURATION * 24 * 60 * 60 * 1000);
};

const borrowRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  issued_at: {
    type: Date,
    default: Date.now
  },
  due_at: {
    type: Date,
    default: getDueDate
  },
  returned_at: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['issued', 'returned'],
    default: 'issued'
  }
}, {
  timestamps: true
});

// Virtual for overdue status
borrowRecordSchema.virtual('is_overdue').get(function() {
  return this.status === 'issued' && this.due_at < new Date();
});

// Ensure virtuals are included when converting to Object/JSON
borrowRecordSchema.set('toJSON', { virtuals: true });
borrowRecordSchema.set('toObject', { virtuals: true });

// Static method to return a book
borrowRecordSchema.methods.returnBook = async function() {
  this.status = 'returned';
  this.returned_at = new Date();
  
  const book = await mongoose.model('Book').findById(this.book);
  book.issued_quantity -= 1;
  await book.save();
  
  return this.save();
};

// Middleware to handle book quantity updates
borrowRecordSchema.pre('save', async function(next) {
  try {
    if (this.isNew && this.status === 'issued') {
      const book = await mongoose.model('Book').findById(this.book);
      book.issued_quantity += 1;
      await book.save();
    }
    next();
  } catch (error) {
    next(error);
  }
});

borrowRecordSchema.pre('remove', async function(next) {
  try {
    if (this.status === 'issued') {
      const book = await mongoose.model('Book').findById(this.book);
      book.issued_quantity -= 1;
      await book.save();
    }
    next();
  } catch (error) {
    next(error);
  }
});

const BorrowRecord = mongoose.model('BorrowRecord', borrowRecordSchema);

module.exports = BorrowRecord;