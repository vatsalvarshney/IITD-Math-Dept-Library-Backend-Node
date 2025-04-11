// seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const { User, Tag, Book, BorrowRecord } = require('../models');
const { syncStudents } = require('./ldapSync');

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library_db')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Sample data
const staffUser = {
  username: 'staff',
  email: 'staff@university.edu',
  password: 'testing123', // This will be hashed by the pre-save hook
  first_name: 'Staff',
  last_name: '1',
  role: 'staff',
};

// Function to seed the database
async function seedDatabase() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Tag.deleteMany({});
    await Book.deleteMany({});
    await BorrowRecord.deleteMany({});

    console.log('Previous data cleared');

    // Create staff user
    const createdUser = await User.create(staffUser);
    console.log(`Staff user created: ${createdUser.username}`);

    // LDAP sync
    const result = await syncStudents();
    console.log('\nStudents sync completed successfully!');
    console.log(`Total students processed: ${result.total}`);
    console.log(`New students created: ${result.created}`);
    console.log(`Existing students updated: ${result.updated}`);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();