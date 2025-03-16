#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const { syncStudents } = require('../scripts/ldapSync');
const logger = require('../config/logger');

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library_db')
  .then(async () => {
    console.log('Connected to MongoDB, running LDAP sync...');
    
    try {
      const result = await syncStudents();
      console.log('\nSync completed successfully!');
      console.log(`Total students processed: ${result.total}`);
      console.log(`New students created: ${result.created}`);
      console.log(`Existing students updated: ${result.updated}`);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      // Close the database connection
      await mongoose.connection.close();
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });