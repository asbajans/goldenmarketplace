-- Vitrin (showcase weight) + ürün dopingi
-- Run: psql -U golden_user -d golden_marketplace -f migrate-showcase-doping.sql
-- NOT: sequelize.sync({alter:true}) de ekler ama production'da bu SQL'i manuel koşun.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS "showcaseWeight" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS "showcaseUntil" TIMESTAMPTZ NULL;

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS "dopingMonthlyLimit" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS "dopingDurationDays" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE products ADD COLUMN IF NOT EXISTS "isDoped" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "dopedUntil" TIMESTAMPTZ NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "dopingStyle" VARCHAR(20) NOT NULL DEFAULT 'gold';

CREATE INDEX IF NOT EXISTS idx_products_doped ON products ("isDoped", "dopedUntil");
CREATE INDEX IF NOT EXISTS idx_stores_showcase ON stores ("showcaseWeight");
