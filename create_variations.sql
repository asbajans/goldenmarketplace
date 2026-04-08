-- Production migration: Create variations and variation_options tables
-- Run this inside the golden-postgres container:
-- docker exec -i golden-postgres psql -U golden_user -d golden_marketplace < create_variations.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "variations" (
    "id"        UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId"    UUID NOT NULL,
    "name"      VARCHAR(255) NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id"),
    CONSTRAINT "variations_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "variations_userId" ON "variations" ("userId");

CREATE TABLE IF NOT EXISTS "variation_options" (
    "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
    "variationId" UUID NOT NULL,
    "value"       VARCHAR(255) NOT NULL,
    "orderIndex"  INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id"),
    CONSTRAINT "variation_options_variationId_fkey"
        FOREIGN KEY ("variationId") REFERENCES "variations"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "variation_options_variationId" ON "variation_options" ("variationId");

-- Confirm
SELECT 'variations table: OK' AS status WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'variations')
UNION ALL
SELECT 'variation_options table: OK' AS status WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'variation_options');
