-- Gramsız feed ürünleri: sahte "1 gr" yerine NULL + pricingType
-- Run: psql -U golden_user -d golden_marketplace -f migrate-product-fixed-pricing.sql
-- NOT: sequelize.sync({alter:true}) de aynı şemayı üretir ama production'da alter tehlikelidir; bu SQL'i manuel koşun.

-- 1. Enum tipi (idempotent)
DO $$ BEGIN
  CREATE TYPE "enum_products_pricingType" AS ENUM ('gold', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Yeni kolon
ALTER TABLE products ADD COLUMN IF NOT EXISTS "pricingType" "enum_products_pricingType" NOT NULL DEFAULT 'gold';

-- 3. gramWeight / milyem nullable yap (sabit fiyatlı üründe NULL = gram bilinmiyor, ekranda gizlenir)
ALTER TABLE products ALTER COLUMN "gramWeight" DROP NOT NULL;
ALTER TABLE products ALTER COLUMN "milyem" DROP NOT NULL;

-- 4. Mevcut çöpleri temizle: fixed-pricing feed'lerden gelip sahte 1 gr basılmış ürünler
--    DİKKAT: gerçek 1 gr ürünleri de yakalayabilir; önce SELECT ile kontrol edin.
--    SELECT sku, title, "gramWeight", "feedSourceId" FROM products
--    WHERE "gramWeight" = 1 AND "feedSourceId" IN (SELECT id FROM external_feeds WHERE "pricingMode" = 'fixed');
UPDATE products
SET "pricingType" = 'fixed', "gramWeight" = NULL, "milyem" = NULL, "gramHas" = NULL, "effectiveMilyem" = NULL
WHERE "gramWeight" = 1
  AND "feedSourceId" IN (SELECT id FROM external_feeds WHERE "pricingMode" = 'fixed');
