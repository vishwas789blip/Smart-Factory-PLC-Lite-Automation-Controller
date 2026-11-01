import './config/env';
import app from './app';
import mongoose from 'mongoose';
import { ENV } from './config/env';
import './services/mqttService';
import { initWebSocketServer } from './services/wsService';
import { loadSchedules } from './services/scheduleService';
import http from 'http';

const PORT = ENV.PORT;
const MONGODB_URI = ENV.MONGODB_URI;

async function startServer() {
  const server = http.createServer(app);
  initWebSocketServer(server);
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Resilient MongoDB connection loop with automatic retry
  const connectWithRetry = async () => {
    while (mongoose.connection.readyState !== 1) {
      try {
        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(MONGODB_URI, {
          serverSelectionTimeoutMS: 8000
        });
        console.log('Connected to MongoDB');
        await loadSchedules();
        console.log('Schedules loaded');
        break;
      } catch (error: any) {
        console.error('Failed to connect to MongoDB, retrying in 5 seconds...', error.message);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  };

  connectWithRetry();

  const shutdown = async () => {
    console.log('\nGracefully shutting down API server...');
    server.close(() => {
      mongoose.connection.close(false).then(() => {
        console.log('API server and MongoDB connection closed.');
        process.exit(0);
      });
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
