const Tag = require('../models/tag');

/**
 * @desc    Get all tags
 * @route   GET /api/tags
 * @access  Public
 */
exports.getTags = async (req, res) => {
  try {
    // Find all tags that have at least one book associated with them
    const tagsWithBooks = await Tag.aggregate([
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: 'tags',
          as: 'books'
        }
      },
      {
        $match: { 'books.0': { $exists: true } }
      },
      {
        $project: {
          _id: 1,
          name: 1
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);
    
    return res.status(200).json(tagsWithBooks);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return res.status(500).json({ error: 'Server error, failed to fetch tags' });
  }
};

/**
 * @desc    Add a new tag
 * @route   POST /api/tags
 * @access  Staff only
 */
exports.addTag = async (req, res) => {
  try {
    const { name } = req.body;
    
    // Validate input
    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    
    // Check if tag already exists
    const existingTag = await Tag.findOne({ name });
    if (existingTag) {
      return res.status(400).json({ error: 'Tag already exists' });
    }
    
    // Create new tag
    const tag = await Tag.create({ name });
    
    return res.status(201).json(tag);
  } catch (error) {
    console.error('Error adding tag:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Server error, failed to add tag' });
  }
};
