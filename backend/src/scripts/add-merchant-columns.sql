-- Add Google Merchant Center columns to stores table
-- Run: psql -U golden_user -d golden_marketplace -f add-merchant-columns.sql

ALTER TABLE stores ADD COLUMN IF NOT EXISTS "merchantCenterId" VARCHAR(100);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS "merchantTargetCountry" VARCHAR(10) DEFAULT 'TR';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS "merchantTargetLanguage" VARCHAR(10) DEFAULT 'tr';

-- If IF NOT EXISTS not supported, use:
-- ALTER TABLE stores ADD COLUMN "merchantCenterId" VARCHAR(100);
-- ALTER TABLE stores ADD COLUMN "merchantTargetCountry" VARCHAR(10) DEFAULT 'TR';
-- ALTER TABLE stores ADD COLUMN "merchantTargetLanguage" VARCHAR(10) DEFAULT 'tr';
