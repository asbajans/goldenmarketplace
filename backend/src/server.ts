import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import winston from 'winston';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Validate optional environment variables (non-blocking warnings)
const envSchema = Joi.object({
  JWT_SECRET: Joi.string().min(16).optional(),
  DB_HOST: Joi.string().optional(),
  DB_NAME: Joi.string().optional(),
  DB_USER: Joi.string().optional(),
  DB_PASSWORD: Joi.string().allow('').optional(),
}).unknown(true);

const { error: envWarning } = envSchema.validate(process.env, { abortEarly: false });
if (envWarning) {
  envWarning.details.forEach(detail => {
    console.warn(`⚠️ Env validation note: ${detail.message}`);
  });
}

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

// Initialize Models
require('./models');
import { GlobalSetting } from './models/GlobalSetting';
import sequelize from './config/database';

async function syncAndSeedSettings() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    // Sync schema - uses alter in both dev and prod to add new columns/tables
    await sequelize.sync({ alter: true });
    logger.info(`[DB] Schema synced (${isProduction ? 'production' : 'development'} mode).`);

    // Seed initial GlobalSettings for Etsy keys
    const settingsToSeed = [
      // Etsy
      { key: 'etsy_api_key', value: '', description: 'Etsy Master Application Key (Client ID)', isPublic: false },
      { key: 'etsy_api_secret', value: '', description: 'Etsy Master Application Shared Secret', isPublic: false },
      // AI
      { key: 'ai_provider', value: 'openai', description: 'AI Provider (openai, openrouter, gemini)', isPublic: true },
      { key: 'ai_api_key', value: '', description: 'AI Provider API Key', isPublic: false },
      { key: 'ai_model', value: 'gpt-4o-mini', description: 'AI Model (e.g. gpt-4o-mini, gemini-pro)', isPublic: true },
      // Bank Transfer
      { key: 'bank_name', value: '', description: 'Bank Name for Wire Transfer', isPublic: true },
      { key: 'bank_iban', value: '', description: 'IBAN for Wire Transfer', isPublic: true },
      { key: 'bank_account_name', value: '', description: 'Account Holder Name', isPublic: true },
      { key: 'bank_swift', value: '', description: 'SWIFT/BIC Code', isPublic: true },
      { key: 'bank_branch', value: '', description: 'Bank Branch Name', isPublic: true },
      // Payment Methods – enabled flags
      { key: 'payment_bank_transfer_enabled', value: 'true', description: 'Enable bank transfer payment method', isPublic: true },
      { key: 'payment_credit_card_enabled', value: 'false', description: 'Enable credit card payment method', isPublic: true },
      { key: 'credit_card_provider', value: 'none', description: 'Active credit card provider: iyzico | paytr | stripe | none', isPublic: true },
      // iyzico
      { key: 'iyzico_api_key', value: '', description: 'iyzico API Key', isPublic: false },
      { key: 'iyzico_secret_key', value: '', description: 'iyzico Secret Key', isPublic: false },
      { key: 'iyzico_base_url', value: 'https://api.iyzipay.com', description: 'iyzico Base URL (sandbox or prod)', isPublic: false },
      // PayTR
      { key: 'paytr_merchant_id', value: '', description: 'PayTR Merchant ID', isPublic: false },
      { key: 'paytr_merchant_key', value: '', description: 'PayTR Merchant Key', isPublic: false },
      { key: 'paytr_merchant_salt', value: '', description: 'PayTR Merchant Salt', isPublic: false },
      // Stripe
      { key: 'stripe_publishable_key', value: '', description: 'Stripe Publishable Key', isPublic: true },
      { key: 'stripe_secret_key', value: '', description: 'Stripe Secret Key', isPublic: false },
    ];

    for (const setting of settingsToSeed) {
      const exists = await GlobalSetting.findOne({ where: { key: setting.key } });
      if (!exists) {
        await GlobalSetting.create(setting);
      }
    }
    logger.info('[DB] GlobalSettings synchronized successfully.');
  } catch (error) {
    logger.error('[DB] Failed to synchronize GlobalSettings:', error);
  }
}

/**
 * Ensures critical performance indexes exist.
 * Runs outside any transaction (required for CONCURRENTLY).
 * IF NOT EXISTS = safe to run on every boot.
 */
async function ensurePerformanceIndexes() {
  // Non-CONCURRENTLY is fine at startup (table has few rows, instant lock release)
  const idxStatements = [
    `CREATE INDEX IF NOT EXISTS idx_products_b2b_active ON products ("isB2BEnabled", "isActive", "storeId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS idx_products_store_b2b ON products ("storeId", "isActive", "isB2BEnabled")`,
    `CREATE INDEX IF NOT EXISTS idx_products_store_created ON products ("storeId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS idx_products_original ON products ("originalProductId")`,
    `CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores ("storeSlug")`,
    `CREATE INDEX IF NOT EXISTS idx_stores_user ON stores ("userId")`,
  ];
  for (const sql of idxStatements) {
    try {
      // transaction: null is REQUIRED — CREATE INDEX cannot run inside a transaction
      await sequelize.query(sql, { raw: true, transaction: null as any });
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        logger.warn('[DB] Index warning:', e.message);
      }
    }
  }
  logger.info('[DB] Performance indexes ensured.');
}

const app: Express = express();

// Trust proxy for rate limiting behind Cloudflare/reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176',
  'https://asb.web.tr', 'https://seller.asb.web.tr', 'https://admin.asb.web.tr',
  'https://market-inky-beta.vercel.app',
  'https://goldencrafters.com',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
app.use('/api/settings', require('./routes/publicSettings').default || require('./routes/publicSettings'));
app.use('/api/categories', require('./routes/categories').default || require('./routes/categories'));
app.use('/api/admin', require('./routes/admin').default || require('./routes/admin'));
app.use('/api/b2b', require('./routes/b2b').default || require('./routes/b2b'));
app.use('/api/marketplace', require('./routes/marketplace').default || require('./routes/marketplace'));
app.use('/api/variations', require('./routes/variations').default || require('./routes/variations'));
app.use('/api/orders/customer', require('./routes/customerOrders').default || require('./routes/customerOrders'));
app.use('/api/orders', require('./routes/orders').default || require('./routes/orders'));
app.use('/api/external-orders', require('./routes/externalOrders').default || require('./routes/externalOrders'));
app.use('/api/cart', require('./routes/cart').default || require('./routes/cart'));
app.use('/api/wishlist', require('./routes/wishlist').default || require('./routes/wishlist'));
app.use('/api/addresses', require('./routes/addresses').default || require('./routes/addresses'));
app.use('/api/feeds', require('./routes/externalFeeds').default || require('./routes/externalFeeds'));

// Start feed auto-sync scheduler
try {
  const { startFeedSyncScheduler } = require('./jobs/feedSyncJob');
  startFeedSyncScheduler();
} catch (err) {
  console.warn('[Server] Feed sync scheduler could not be started:', err);
}

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

  // Initialize background jobs
  try {
    await syncAndSeedSettings();
    // Create performance indexes (CONCURRENTLY, no lock, safe to re-run)
    await ensurePerformanceIndexes();

    const { initGoldPriceJob } = require('./jobs/goldPriceJob');
    await initGoldPriceJob();

    // Start Product Sync Worker
    require('./jobs/productSyncJob');
    
    // Start Log Cleanup Job
    const { startLogCleanupJob } = require('./jobs/logCleanupJob');
    startLogCleanupJob();
  } catch (error) {
    logger.error('Failed to init jobs:', error);
  }
});

export default app;
