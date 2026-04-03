require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./db/pool');
const { connectRedis } = require('./services/redis');
const { initWebPush } = require('./services/pushNotification');
const { startScheduler } = require('./workers/scheduler');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await connectDB();
    logger.info('Database connected');
    await connectRedis();
    initWebPush();
    app.listen(PORT, () => {
      logger.info(`Financial OS API v2.0 on port ${PORT} [${process.env.NODE_ENV}]`);
    });
    startScheduler();
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
