-- Feed bazında otomatik AI çevirisi anahtarı (sessiz kuyruk yerine onaylı akış)
-- Run: psql -U golden_user -d golden_marketplace -f migrate-feed-autotranslate.sql
-- NOT: sequelize.sync({alter:true}) de ekler ama production'da bu SQL'i manuel koşun.
-- Onay state'i lastSyncResult JSON içindeki translationApproval alanında tutulur (kolon gerekmez).

ALTER TABLE external_feeds ADD COLUMN IF NOT EXISTS "autoTranslate" BOOLEAN NOT NULL DEFAULT false;
