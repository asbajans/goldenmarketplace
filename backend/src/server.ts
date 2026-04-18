import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Load environment variables
dotenv.config();

// Initialize Models
require('./models');
import { GlobalSetting } from './models/GlobalSetting';
import sequelize from './config/database';

async function syncAndSeedSettings() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      // Development only: sync schema changes automatically
      await sequelize.sync({ alter: true });
      console.log('[DB] Schema synced (development mode).');
    } else {
      // Production: verify connection, then safely create any NEW tables only
      // sync({ force: false, alter: false }) = only creates missing tables, never modifies existing ones
      await sequelize.authenticate();
      console.log('[DB] Connection verified (production mode).');
      await sequelize.sync({ force: false, alter: false });
      console.log('[DB] New tables created if missing (safe sync).');

      // Migration: Try to add columns, but don't fail if they exist
      try {
        await sequelize.query(`ALTER TABLE stores ADD COLUMN commissionRate DECIMAL(5,2) DEFAULT 10`, { raw: true });
        console.log('[DB] Added commissionRate to stores');
      } catch (e: any) {
        // Column may already exist
      }
      try {
        await sequelize.query(`ALTER TABLE stores ADD COLUMN "defaultShippingDays" INTEGER DEFAULT 3`, { raw: true });
      } catch (e: any) {}
      try {
        await sequelize.query(`ALTER TABLE stores ADD COLUMN "availableShippingCompanies" JSON DEFAULT '["MNG Kargo"]'`, { raw: true });
      } catch (e: any) {}
      console.log('[DB] Store migration done.');

      try {
        await sequelize.query(`ALTER TABLE products ADD COLUMN discountRate DECIMAL(5,2) DEFAULT 0`, { raw: true });
      } catch (e: any) {}
      try {
        await sequelize.query(`ALTER TABLE products ADD COLUMN discountedPrice DECIMAL(15,2) DEFAULT 0`, { raw: true });
      } catch (e: any) {}
      console.log('[DB] Product migration done.');

      // Check if orders table exists, create if not
      try {
        const tableExists = await sequelize.query(`
          SELECT 1 FROM information_schema.tables WHERE table_name = 'orders'
        `, { raw: true });
        
        if (!tableExists[0]?.length) {
          await sequelize.query(`
            CREATE TABLE orders (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              "orderNumber" VARCHAR UNIQUE NOT NULL,
              "customerId" UUID NOT NULL,
              "sellerId" UUID NOT NULL,
              "storeId" UUID NOT NULL,
              status VARCHAR DEFAULT 'pending',
              subtotal DECIMAL(15,2) DEFAULT 0,
              "shippingCost" DECIMAL(15,2) DEFAULT 0,
              "totalAmount" DECIMAL(15,2) DEFAULT 0,
              "commissionRate" DECIMAL(5,2) DEFAULT 10,
              "commissionAmount" DECIMAL(15,2) DEFAULT 0,
              "sellerEarnings" DECIMAL(15,2) DEFAULT 0,
              "shippingTime" INTEGER DEFAULT 3,
              "shippingDeadline" TIMESTAMP,
              "trackingNumber" VARCHAR,
              "shippingCompany" VARCHAR,
              "orderDate" TIMESTAMP DEFAULT NOW(),
              "confirmedDate" TIMESTAMP,
              "shippedDate" TIMESTAMP,
              "deliveredDate" TIMESTAMP,
              source VARCHAR DEFAULT 'golden',
              "externalOrderId" VARCHAR,
              "shippingAddress" JSONB,
              "billingAddress" JSONB,
              "customerNote" TEXT,
              "createdAt" TIMESTAMP DEFAULT NOW(),
              "updatedAt" TIMESTAMP DEFAULT NOW()
            )
          `, { raw: true });
          console.log('[DB] Orders table created.');
        }
      } catch (e: any) {
        console.log('[DB] Orders table check skipped:', e.message);
      }

      try {
        const tableExists = await sequelize.query(`
          SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items'
        `, { raw: true });
        
        if (!tableExists[0]?.length) {
          await sequelize.query(`
            CREATE TABLE order_items (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              "orderId" UUID NOT NULL,
              "productId" UUID NOT NULL,
              "variantId" UUID,
              title VARCHAR NOT NULL,
              sku VARCHAR NOT NULL,
              quantity INTEGER DEFAULT 1,
              "unitPrice" DECIMAL(15,2) NOT NULL,
              "totalPrice" DECIMAL(15,2) NOT NULL,
              "createdAt" TIMESTAMP DEFAULT NOW(),
              "updatedAt" TIMESTAMP DEFAULT NOW()
            )
          `, { raw: true });
          console.log('[DB] OrderItems table created.');
        }
      } catch (e: any) {
        console.log('[DB] OrderItems table check skipped:', e.message);
      }
    }

    // Seed initial GlobalSettings for Etsy keys
    const settingsToSeed = [
      { key: 'etsy_api_key', value: '', description: 'Etsy Master Application Key (Client ID)', isPublic: false },
      { key: 'etsy_api_secret', value: '', description: 'Etsy Master Application Shared Secret', isPublic: false },
      { key: 'ai_provider', value: 'openai', description: 'AI Provider (openai, openrouter, gemini)', isPublic: true },
      { key: 'ai_api_key', value: '', description: 'AI Provider API Key', isPublic: false },
      { key: 'ai_model', value: 'gpt-4o-mini', description: 'AI Model (e.g. gpt-4o-mini, gemini-pro)', isPublic: true }
    ];

    for (const setting of settingsToSeed) {
      const exists = await GlobalSetting.findOne({ where: { key: setting.key } });
      if (!exists) {
        await GlobalSetting.create(setting);
      }
    }
    console.log('[DB] GlobalSettings synchronized successfully.');
  } catch (error) {
    console.error('[DB] Failed to synchronize GlobalSettings:', error);
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
        console.warn('[DB] Index warning:', e.message);
      }
    }
  }
  console.log('[DB] Performance indexes ensured.');
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

const app: Express = express();

// Trust proxy for rate limiting behind Cloudflare/reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176',
    'https://asb.web.tr', 'https://seller.asb.web.tr', 'https://admin.asb.web.tr',
    'https://asb.web.tr', 'https://seller.asb.web.tr', 'https://admin.asb.web.tr'
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
app.use('/api/categories', require('./routes/categories').default || require('./routes/categories'));
app.use('/api/admin', require('./routes/admin').default || require('./routes/admin'));
app.use('/api/b2b', require('./routes/b2b').default || require('./routes/b2b'));
app.use('/api/marketplace', require('./routes/marketplace').default || require('./routes/marketplace'));
app.use('/api/variations', require('./routes/variations').default || require('./routes/variations'));
app.use('/api/orders', require('./routes/orders').default || require('./routes/orders'));
app.use('/api/external-orders', require('./routes/externalOrders').default || require('./routes/externalOrders'));

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
    console.error('Failed to init jobs:', error);
  }
});

export default app;
