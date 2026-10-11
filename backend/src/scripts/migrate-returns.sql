-- İade talepleri (ReturnRequest)
-- Run: psql -U golden_user -d golden_marketplace -f migrate-returns.sql
-- NOT: sequelize.sync({alter:true}) de oluşturur ama production'da bu SQL'i manuel koşun.

DO $$ BEGIN
  CREATE TYPE "enum_return_requests_reason" AS ENUM ('withdrawal', 'defective', 'wrong', 'incomplete', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "enum_return_requests_status" AS ENUM ('pending', 'approved', 'rejected', 'shipped', 'inspected', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "return_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL REFERENCES orders("id"),
  "orderItemId" UUID NULL,
  "productId" UUID NOT NULL,
  "storeId" UUID NOT NULL REFERENCES stores("id"),
  "customerId" UUID NOT NULL REFERENCES users("id"),
  "sellerId" UUID NOT NULL,
  "reason" "enum_return_requests_reason" NOT NULL DEFAULT 'withdrawal',
  "customerNote" TEXT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "refundAmount" DECIMAL(15, 2) NULL,
  "status" "enum_return_requests_status" NOT NULL DEFAULT 'pending',
  "sellerNote" TEXT NULL,
  "returnAddress" TEXT NULL,
  "trackingNumber" VARCHAR(120) NULL,
  "decidedAt" TIMESTAMPTZ NULL,
  "refundedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_order ON return_requests ("orderId", "status");
CREATE INDEX IF NOT EXISTS idx_returns_store ON return_requests ("storeId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS idx_returns_customer ON return_requests ("customerId", "createdAt");
