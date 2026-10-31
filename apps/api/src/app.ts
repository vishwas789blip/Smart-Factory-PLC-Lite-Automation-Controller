import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import actuatorRoutes from './routes/actuators';
import analyticsRoutes from './routes/analytics';
import alertRoutes from './routes/alerts';
import scheduleRoutes from './routes/schedules';
import automationRoutes from './routes/automations';
import deviceRoutes from './routes/devices';
import factoryRoutes from './routes/factories';
import sensorRoutes from './routes/sensors';
import telemetryRoutes from './routes/telemetry';
import auditLogRoutes from './routes/auditLogs';
import aiRoutes from './routes/ai';
import mongoose from 'mongoose';
import { mqttClient } from './services/mqttService';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for development
}));
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all dev origins while preserving credentials
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests' }
});
app.use('/api', globalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/actuators', actuatorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/factories', factoryRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/ai', aiRoutes);

// Health endpoints
const healthHandler = async (req: express.Request, res: express.Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'ok' : 'error';
  const mqttStatus = mqttClient.connected ? 'ok' : 'error';
  const overall = dbStatus === 'ok' && mqttStatus === 'ok' ? 'ok' : 'degraded';
  res.status(overall === 'ok' ? 200 : 503).json({
    status: overall,
    services: {
      api: 'ok',
      mongodb: dbStatus,
      mqtt: mqttStatus
    },
    timestamp: new Date().toISOString()
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Readiness endpoints
const readyHandler = async (req: express.Request, res: express.Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ status: 'not_ready', reason: 'Database not connected' });
  }
  res.json({ status: 'ready' });
};

app.get('/ready', readyHandler);
app.get('/api/ready', readyHandler);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

export default app;
