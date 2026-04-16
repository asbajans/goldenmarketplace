-- Add payment columns to stores table
-- Run this SQL to add new payment columns

ALTER TABLE stores ADD COLUMN IF NOT EXISTS bankName VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS iban VARCHAR(50);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS accountNumber VARCHAR(50);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS accountHolder VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS branchCode VARCHAR(50);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS cryptoWallet VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS paymentMethods JSONB DEFAULT '{"stripe":true,"bankTransfer":false,"crypto":false}';

-- If IF NOT EXISTS not supported, use:
-- ALTER TABLE stores ADD COLUMN bankName VARCHAR(255);
-- ALTER TABLE stores ADD COLUMN iban VARCHAR(50);
-- etc.