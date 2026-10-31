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
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    await loadSchedules();
    console.log('Schedules loaded');
    
    const server = http.createServer(app);
    initWebSocketServer(server);
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

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
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
