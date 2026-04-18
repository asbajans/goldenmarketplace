-- Add new columns for order system
-- Run this SQL to add columns for commission and shipping

-- Stores table columns
ALTER TABLE stores ADD COLUMN IF NOT EXISTS commissionRate DECIMAL(5,2) DEFAULT 10;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS defaultShippingDays INTEGER DEFAULT 3;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS availableShippingCompanies JSON DEFAULT '["MNG Kargo", "Yurtiçi Kargo", "Sürat Kargo", "PTT Kargo"]';

-- Products table columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS discountRate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discountedPrice DECIMAL(15,2) DEFAULT 0;

-- Create orders table if not exists
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orderNumber" VARCHAR UNIQUE NOT NULL,
    "customerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    status VARCHAR DEFAULT 'pending',
    subtotal DECIMAL(15,2) DEFAULT 0,
    "shippingCost" DECIMAL(15,2) DEFAULT 0,
    "totalAmount" DECIMAL(15,2) DEFAULT 0,
    "commissionRate" DECIMAL(5,2) DEFAULT 10,
    "commissionAmount" DECIMAL(15,2) DEFAULT 0,
    "sellerEarnings" DECIMAL(15,2) DEFAULT 0,
    "shippingTime" INTEGER DEFAULT 3,
    "shippingDeadline" TIMESTAMP,
    "trackingNumber" VARCHAR,
    "shippingCompany" VARCHAR,
    "orderDate" TIMESTAMP DEFAULT NOW(),
    "confirmedDate" TIMESTAMP,
    "shippedDate" TIMESTAMP,
    "deliveredDate" TIMESTAMP,
    source VARCHAR DEFAULT 'golden',
    "externalOrderId" VARCHAR,
    "shippingAddress" JSONB,
    "billingAddress" JSONB,
    "customerNote" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create order_items table if not exists
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    title VARCHAR NOT NULL,
    sku VARCHAR NOT NULL,
    quantity INTEGER DEFAULT 1,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "totalPrice" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_orders_orderNumber ON orders("orderNumber");
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders("sellerId", status);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders("storeId", status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source, status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);