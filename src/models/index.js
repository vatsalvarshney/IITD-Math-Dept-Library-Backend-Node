// Export all models from this file
const User = require('./user');
const Tag = require('./tag');
const Book = require('./book');
const BorrowRecord = require('./borrowRecord');

module.exports = {
  User,
  Tag,
  Book,
  BorrowRecord
};