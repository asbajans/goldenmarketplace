-- Yorumlar: dil + çeviri önbelleği + kaynak (human/ai)
-- Run: psql -U golden_user -d golden_marketplace -f migrate-review-i18n.sql
-- NOT: sequelize.sync({alter:true}) de ekler ama production'da bu SQL'i manuel koşun.

ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS "language" VARCHAR(10) NOT NULL DEFAULT 'tr';
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS "source" VARCHAR(20) NOT NULL DEFAULT 'human';

CREATE INDEX IF NOT EXISTS idx_reviews_product_lang ON product_reviews ("productId", "language");
