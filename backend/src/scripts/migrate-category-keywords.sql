-- Category.keywords kolonu (oto-kategorizasyon anahtar kelimeleri)
-- Run: psql -U golden_user -d golden_marketplace -f migrate-category-keywords.sql
-- NOT: sequelize.sync({alter:true}) de ekler ama production'da bu SQL'i manuel koşun.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS "keywords" JSONB NOT NULL DEFAULT '[]';
