-- Kategori vitrin ağırlığı (ana sayfa bölüm sırası)
-- Run: psql -U golden_user -d golden_marketplace -f migrate-category-showcase.sql
-- NOT: sequelize.sync({alter:true}) de ekler ama production'da bu SQL'i manuel koşun.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS "showcaseWeight" INTEGER NOT NULL DEFAULT 0;
