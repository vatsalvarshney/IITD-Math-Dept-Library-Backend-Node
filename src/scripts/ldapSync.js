const axios = require('axios');
const cheerio = require('cheerio');
const { User } = require('../models');
const logger = require('../config/logger');
const https = require('https');

// Create axios instance that ignores SSL certificate issues (for development only)
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

/**
 * Split a full name into first name and last name
 * @param {string} name - Full name to split
 * @returns {Array} - Array containing first name and last name
 */
const splitName = (name) => {
  const parts = name.split(' ');
  return [parts[0], parts.slice(1).join(' ')];
};

/**
 * Fetch all students data from LDAP
 * @returns {Promise<Array>} - Array of student objects
 */
const getAllStudents = async () => {
  const students = [];
  const usernames = new Set();
  const programs = ['btech', 'mtech', 'phd', 'msc', 'dual'];

  console.log('Starting to fetch student data from LDAP...');

  for (const prog of programs) {
    try {
      const url = `https://ldapweb.iitd.ac.in/LDAP/maths/${prog}.shtml`;
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);

      const batches = [];
      $('table td').each((_, cell) => {
        batches.push($(cell).text().trim());
      });

      if (batches.length === 0) {
        logger.warn(`No batches found for program: ${prog}`);
        continue;
      }

      for (const batch of batches) {
        try {
          const batchUrl = `https://ldapweb.iitd.ac.in/LDAP/maths/${batch}.shtml`;
          const batchResponse = await axiosInstance.get(batchUrl);
          const $batch = cheerio.load(batchResponse.data);

          $batch('table tr').slice(1).each((_, row) => {
            const cols = $batch(row).find('td');
            if (cols.length !== 2) return;

            const username = $batch(cols[0]).text().trim();
            const fullName = $batch(cols[1]).text().trim();
            
            if (!username || !fullName || usernames.has(username)) return;

            const [first_name, last_name] = splitName(fullName);
            
            students.push({
              username,
              first_name,
              last_name,
              email: `${username}@iitd.ac.in`
            });
            
            usernames.add(username);
          });
        } catch (error) {
          logger.error(`Failed to fetch batch data for ${batch}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to fetch program data for ${prog}: ${error.message}`);
    }
  }

  console.log(`Fetched ${students.length} students from LDAP`);
  return students;
};

/**
 * Sync students data with the database
 * @returns {Promise<Object>} - Statistics about the sync process
 */
const syncStudents = async () => {
  console.log('Starting LDAP sync process...');
  
  const stats = {
    total: 0,
    created: 0,
    updated: 0
  };

  try {
    const students = await getAllStudents();
    
    for (const student of students) {
      try {
        // Find or create user
        let user = await User.findOne({ username: student.username });
        
        if (user) {
          // Update existing user if needed
          if (user.first_name !== student.first_name || user.last_name !== student.last_name) {
            user.first_name = student.first_name;
            user.last_name = student.last_name;
            await user.save();
            stats.updated++;
          }
        } else {
          // Create new user
          user = new User({
            username: student.username,
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email,
            role: 'student',
            password: ''
          });
          await user.save();
          stats.created++;
        }
        
        stats.total++;
      } catch (error) {
        logger.error(`Error processing student ${student.username}: ${error.message}`);
      }
    }
    
    console.log(`LDAP sync completed: processed ${stats.total} students, created ${stats.created}, updated ${stats.updated}`);
    return stats;
  } catch (error) {
    logger.error(`LDAP sync failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  syncStudents,
  getAllStudents
};