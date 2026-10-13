-- Taş kataloğu + ürün taş seçenekleri + sepet taş referansı
-- Run: psql -U golden_user -d golden_marketplace -f migrate-gemstones.sql
-- NOT: sequelize.sync({alter:true}) de oluşturur ama production'da bu SQL'i manuel koşun.

CREATE TABLE IF NOT EXISTS "gemstones" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "storeId" UUID NULL REFERENCES stores("id"),
  "name" VARCHAR(120) NOT NULL,
  "pricePerCaratUSD" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "cutMultipliers" JSONB NULL DEFAULT '{}',
  "qualityMultipliers" JSONB NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gemstones_store ON gemstones ("storeId", "isActive");

-- Mevcut kurulumlar: TRY kolonu USD'ye çevrilir, storeId nullable olur
ALTER TABLE gemstones ALTER COLUMN "storeId" DROP NOT NULL;
DO $$ BEGIN
  ALTER TABLE gemstones RENAME COLUMN "pricePerCaratTRY" TO "pricePerCaratUSD";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Taş adı çevirileri
ALTER TABLE gemstones ADD COLUMN IF NOT EXISTS "translations" JSONB NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "product_stones" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL REFERENCES products("id") ON DELETE CASCADE,
  "gemstoneId" UUID NOT NULL REFERENCES gemstones("id") ON DELETE CASCADE,
  "carat" DECIMAL(10, 4) NULL,
  "cut" VARCHAR(60) NULL,
  "quality" VARCHAR(120) NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_stones_product ON product_stones ("productId");
CREATE INDEX IF NOT EXISTS idx_product_stones_gem ON product_stones ("gemstoneId");

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "productStoneId" UUID NULL;

-- Sabit taş bayrağı (seçimsiz bilgi satırı)
ALTER TABLE product_stones ADD COLUMN IF NOT EXISTS "isFixed" BOOLEAN NOT NULL DEFAULT false;
