// seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const { User, Tag, Book } = require('../models');

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

const tags = [
  { name: 'Calculus' },
  { name: 'Linear Algebra' },
  { name: 'Discrete Mathematics' },
  { name: 'Number Theory' },
  { name: 'Abstract Algebra' },
  { name: 'Topology' },
  { name: 'Real Analysis' },
  { name: 'Complex Analysis' },
  { name: 'Differential Equations' },
  { name: 'Probability & Statistics' },
  { name: 'Numerical Methods' },
  { name: 'Mathematical Physics' },
  { name: 'Combinatorics' },
  { name: 'Geometry' },
  { name: 'Graph Theory' },
  { name: 'Textbook' },
  { name: 'Reference' },
  { name: 'Graduate Level' },
  { name: 'Undergraduate Level' },
];

const books = [
  {
    isbn: '9780521675994',
    title: 'A Course in Pure Mathematics',
    author: 'G. H. Hardy',
    total_quantity: 5,
    issued_quantity: 0,
    description: 'A classic textbook for undergraduate students covering calculus, algebra, and analysis.',
    shelf: 'A',
    rack: '1',
  },
  {
    isbn: '9780486661100',
    title: 'Linear Algebra',
    author: 'Georgi E. Shilov',
    total_quantity: 4,
    issued_quantity: 0,
    description: 'A comprehensive introduction to linear algebra with applications.',
    shelf: 'A',
    rack: '2',
  },
  {
    isbn: '9780521867443',
    title: 'Principles of Mathematical Analysis',
    author: 'Walter Rudin',
    total_quantity: 6,
    issued_quantity: 0,
    description: 'Often called "Baby Rudin," this is a classic text for introductory real analysis.',
    shelf: 'A',
    rack: '3',
  },
  {
    isbn: '9780201558029',
    title: 'Concrete Mathematics',
    author: 'Ronald Graham, Donald Knuth, Oren Patashnik',
    total_quantity: 3,
    issued_quantity: 0,
    description: 'A foundation for computer science covering discrete mathematics.',
    shelf: 'B',
    rack: '1',
  },
  {
    isbn: '9780471433347',
    title: 'Introduction to Probability Theory',
    author: 'Paul G. Hoel, Sidney C. Port, Charles J. Stone',
    total_quantity: 4,
    issued_quantity: 0,
    description: 'A rigorous approach to probability theory for mathematics and statistics students.',
    shelf: 'B',
    rack: '2',
  },
  {
    isbn: '9780486656229',
    title: 'Differential Equations and Their Applications',
    author: 'Martin Braun',
    total_quantity: 5,
    issued_quantity: 0,
    description: 'An introduction to applied mathematics focusing on ordinary differential equations.',
    shelf: 'B',
    rack: '3',
  },
  {
    isbn: '9780471608394',
    title: 'Elementary Number Theory',
    author: 'David M. Burton',
    total_quantity: 3,
    issued_quantity: 0,
    description: 'A friendly introduction to number theory accessible to undergraduate students.',
    shelf: 'C',
    rack: '1',
  },
  {
    isbn: '9780521675995',
    title: 'Topology',
    author: 'James R. Munkres',
    total_quantity: 4,
    issued_quantity: 0,
    description: 'A standard text in topology covering point-set and algebraic topology.',
    shelf: 'C',
    rack: '2',
  },
  {
    isbn: '9780387903699',
    title: 'Abstract Algebra',
    author: 'I. N. Herstein',
    total_quantity: 3,
    issued_quantity: 0,
    description: 'A rigorous treatment of groups, rings, and fields for undergraduate students.',
    shelf: 'C',
    rack: '3',
  },
  {
    isbn: '9780486600611',
    title: 'A Book of Curves',
    author: 'E. H. Lockwood',
    total_quantity: 2,
    issued_quantity: 0,
    description: 'An illustrated introduction to interesting curves and their properties.',
    shelf: 'D',
    rack: '1',
  },
  {
    isbn: '9780691118802',
    title: 'The Princeton Companion to Mathematics',
    author: 'Timothy Gowers',
    total_quantity: 2,
    issued_quantity: 0,
    description: 'A comprehensive reference to modern mathematics and its applications.',
    shelf: 'D',
    rack: '2',
  },
  {
    isbn: '9780134689562',
    title: 'Calculus: Early Transcendentals',
    author: 'James Stewart',
    total_quantity: 10,
    issued_quantity: 0,
    description: 'A widely used calculus textbook for undergraduate students.',
    shelf: 'D',
    rack: '3',
  },
  {
    isbn: '9780521675993',
    title: 'A First Course in Graph Theory',
    author: 'Gary Chartrand, Ping Zhang',
    total_quantity: 3,
    issued_quantity: 0,
    description: 'An introduction to graph theory with applications.',
    shelf: 'E',
    rack: '1',
  },
  {
    isbn: '9780387952697',
    title: 'Complex Analysis',
    author: 'Elias M. Stein, Rami Shakarchi',
    total_quantity: 4,
    issued_quantity: 0,
    description: 'A comprehensive introduction to complex analysis for undergraduate and graduate students.',
    shelf: 'E',
    rack: '2',
  },
  {
    isbn: '9780070542358',
    title: 'Mathematical Methods for Physicists',
    author: 'George B. Arfken, Hans J. Weber',
    total_quantity: 3,
    issued_quantity: 0,
    description: 'A comprehensive reference for mathematical methods used in physics.',
    shelf: 'E',
    rack: '3',
  },
];

// Function to seed the database
async function seedDatabase() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Tag.deleteMany({});
    await Book.deleteMany({});

    console.log('Previous data cleared');

    // Create staff user
    const createdUser = await User.create(staffUser);
    console.log(`Staff user created: ${createdUser.username}`);

    // Create tags
    const createdTags = await Tag.insertMany(tags);
    console.log(`${createdTags.length} tags created`);

    // Map tag names to their ids for reference
    const tagMap = {};
    createdTags.forEach(tag => {
      tagMap[tag.name] = tag._id;
    });

    const booksWithTags = books.map(book => {
        // Randomly assign 1-3 tags to each book
        const randomTags = [];
        const tagTypes = [...tags.map(tag => tag.name)];
        
        // Determine how many tags to assign (1-3)
        const numTags = Math.floor(Math.random() * 3) + 1;
        
        // Pick random unique tags
        while (randomTags.length < numTags && tagTypes.length > 0) {
          const randomIndex = Math.floor(Math.random() * tagTypes.length);
          const tagType = tagTypes[randomIndex];
          
          if (tagMap[tagType] && !randomTags.includes(tagMap[tagType])) {
            randomTags.push(tagMap[tagType]);
          }
          
          // Remove the tag type so we don't pick it again
          tagTypes.splice(randomIndex, 1);
        }
        
        return {
          ...book,
          tags: randomTags
        };
      });

    // Create books with tags
    const createdBooks = await Book.insertMany(booksWithTags);
    console.log(`${createdBooks.length} books created`);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();