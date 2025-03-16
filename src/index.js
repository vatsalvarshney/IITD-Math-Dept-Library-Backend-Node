const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const routes = require('./routes');
require('dotenv').config();
const logger = require('./config/logger');
const { initScheduledJobs } = require('./config/scheduler');

// Initialize express
const app = express();
const PORT = process.env.PORT || 5000;

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Use routes
app.use('/api', routes);

// Routes will be added here
app.get('/', (req, res) => {
  res.send('Library Management API is running');
});

// Connect to database
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library_db')
  .then(() => {
    logger.info('Connected to MongoDB');
    
    // Initialize scheduled jobs
    initScheduledJobs();
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error(`Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  });