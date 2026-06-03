import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('[MigrateAI] Database connected.');

    // 1) SubscriptionPlan AI fields
    await sequelize.query(`
      ALTER TABLE subscription_plans
      ADD COLUMN IF NOT EXISTS "aiTranslationEnabled" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "aiContentEnabled" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "aiMonthlyCredit" INTEGER DEFAULT 0;
    `);
    console.log('[MigrateAI] Added AI fields to subscription_plans.');

    // 2) User AI credit fields
    await sequelize.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS "aiCreditsUsedThisMonth" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "aiCreditBalance" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "aiCreditsLastResetAt" TIMESTAMP WITH TIME ZONE;
    `);
    console.log('[MigrateAI] Added AI credit fields to users.');

    // 3) ProductAITask table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_ai_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "taskType" VARCHAR(50) NOT NULL DEFAULT 'both',
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "progress" INTEGER DEFAULT 0,
        "creditsConsumed" INTEGER DEFAULT 0,
        "result" JSONB,
        "error" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "completedAt" TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('[MigrateAI] Created product_ai_tasks table.');

    // 4) Indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_ai_tasks_product ON product_ai_tasks("productId");
      CREATE INDEX IF NOT EXISTS idx_product_ai_tasks_user ON product_ai_tasks("userId");
      CREATE INDEX IF NOT EXISTS idx_product_ai_tasks_status ON product_ai_tasks("status");
    `);
    console.log('[MigrateAI] Created indexes.');

    // 5) Seed AI GlobalSettings if missing
    await sequelize.query(`
      INSERT INTO global_settings (key, value, description, "isPublic", "createdAt", "updatedAt")
      SELECT 'ai_credit_packs', '[{"credits":100,"price":50},{"credits":500,"price":200},{"credits":1000,"price":350}]', 'AI Credit purchase packs', true, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM global_settings WHERE key = 'ai_credit_packs');
    `);
    await sequelize.query(`
      INSERT INTO global_settings (key, value, description, "isPublic", "createdAt", "updatedAt")
      SELECT 'ai_translation_cost', '1', 'AI translation cost per product in credits', true, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM global_settings WHERE key = 'ai_translation_cost');
    `);
    await sequelize.query(`
      INSERT INTO global_settings (key, value, description, "isPublic", "createdAt", "updatedAt")
      SELECT 'ai_content_cost', '1', 'AI content generation cost per product in credits', true, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM global_settings WHERE key = 'ai_content_cost');
    `);
    console.log('[MigrateAI] Seeded AI GlobalSettings.');

    console.log('[MigrateAI] Done.');
    process.exit(0);
  } catch (err) {
    console.error('[MigrateAI] Error:', err);
    process.exit(1);
  }
}

main();
