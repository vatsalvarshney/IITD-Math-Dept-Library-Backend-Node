const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  isbn: {
    type: String,
    required: true,
    unique: true,
    maxlength: 13
  },
  title: {
    type: String,
    required: true,
    maxlength: 255
  },
  author: {
    type: String,
    required: true,
    maxlength: 255
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  total_quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  issued_quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String
  },
  shelf: {
    type: String,
    maxlength: 50
  },
  rack: {
    type: String,
    maxlength: 50
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Virtual for available quantity
bookSchema.virtual('available_quantity').get(function() {
  return this.total_quantity - this.issued_quantity;
});

// Ensure virtuals are included when converting to JSON
bookSchema.set('toJSON', { virtuals: true });
bookSchema.set('toObject', { virtuals: true });

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;