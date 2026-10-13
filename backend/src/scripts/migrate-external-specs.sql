-- Tedarikçi detay specs tablosu (tek seferlik scrape deposu)
-- Run: psql -U golden_user -d golden_marketplace -f migrate-external-specs.sql
-- NOT: sequelize.sync({alter:true}) de oluşturur ama production'da bu SQL'i manuel koşun.

CREATE TABLE IF NOT EXISTS "external_product_specs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "feedId" UUID NOT NULL REFERENCES external_feeds("id"),
  "sku" VARCHAR(255) NOT NULL,
  "sourceUrl" VARCHAR(2000) NULL,
  "specs" JSONB NULL DEFAULT '{}',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "fetchedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "uq_specs_feed_sku" UNIQUE ("feedId", "sku")
);

CREATE INDEX IF NOT EXISTS idx_specs_feed_sku ON external_product_specs ("feedId", "sku");
CREATE INDEX IF NOT EXISTS idx_specs_feed ON external_product_specs ("feedId");

-- Ürün teknik özellik sözlüğü (detay sayfasında tablo olarak gösterilir)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "specs" JSONB NULL;
