import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const app: Express = express();

// Trust proxy for rate limiting behind Cloudflare/reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
    'https://app.goldencrafters.com', 'https://seller.goldencrafters.com', 'https://admin.goldencrafters.com'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased for production stability
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes (akan ditambahkan)
app.use('/api/auth', require('./routes/auth').default || require('./routes/auth'));
app.use('/api/products', require('./routes/products').default || require('./routes/products'));
app.use('/api/gold-price', require('./routes/goldPrice').default || require('./routes/goldPrice'));
app.use('/api/subscriptions', require('./routes/subscriptions').default || require('./routes/subscriptions'));
app.use('/api/integrations', require('./routes/integrations').default || require('./routes/integrations'));
app.use('/api/feed', require('./routes/feed').default || require('./routes/feed'));
// app.use('/api/admin', require('./routes/admin'));

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err);

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handling
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Start server
const PORT = process.env.PORT || 777;
app.listen(PORT, async () => {
  logger.info(`Server is running on port ${PORT}`);
  console.log(`🚀 Server started at http://localhost:${PORT}`);

  // Initialize background jobs
  try {
    const { initGoldPriceJob } = require('./jobs/goldPriceJob');
    await initGoldPriceJob();

    // Start Product Sync Worker
    require('./jobs/productSyncJob');
  } catch (error) {
    console.error('Failed to init jobs:', error);
  }
});

export default app;
