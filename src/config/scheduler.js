const cron = require('node-cron');
const { syncStudents } = require('../scripts/ldapSync');
const logger = require('./logger');

/**
 * Initialize all scheduled jobs
 */
const initScheduledJobs = () => {
  // Schedule student sync to run every Monday at 3:00 AM
  cron.schedule('0 3 * * 1', async () => {
    logger.info('Starting scheduled LDAP student sync');
    try {
      const result = await syncStudents();
      logger.info(`LDAP sync completed successfully. Processed: ${result.total}, Created: ${result.created}, Updated: ${result.updated}`);
    } catch (error) {
      logger.error(`Scheduled LDAP sync failed: ${error.message}`);
    }
  }, {
    timezone: "Asia/Kolkata" // Set to Indian timezone
  });

  logger.info('All scheduled jobs initialized');
};

module.exports = {
  initScheduledJobs
};