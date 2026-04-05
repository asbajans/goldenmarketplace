/**
 * add-product-indexes.ts
 * One-time migration script to add performance indexes.
 * Run: npx ts-node src/scripts/add-product-indexes.ts
 */

import sequelize from '../config/database';

async function addIndexes() {
  const qi = sequelize.getQueryInterface();
  
  const indexes = [
    {
      table: 'products',
      name: 'idx_products_b2b_active',
      fields: ['"isB2BEnabled"', '"isActive"', '"storeId"', '"createdAt"']
    },
    {
      table: 'products',
      name: 'idx_products_store_active',
      fields: ['"storeId"', '"isActive"', '"isB2BEnabled"']
    },
    {
      table: 'products',
      name: 'idx_products_store_created',
      fields: ['"storeId"', '"createdAt"']
    },
    {
      table: 'products',
      name: 'idx_products_original_product',
      fields: ['"originalProductId"']
    },
    {
      table: 'stores',
      name: 'idx_stores_slug',
      fields: ['"storeSlug"'],
      unique: true
    },
    {
      table: 'stores',
      name: 'idx_stores_user',
      fields: ['"userId"'],
      unique: true
    }
  ];

  for (const idx of indexes) {
    try {
      const sql = `CREATE ${idx.unique ? 'UNIQUE ' : ''}INDEX CONCURRENTLY IF NOT EXISTS "${idx.name}" ON "${idx.table}" (${idx.fields.join(', ')})`;
      await sequelize.query(sql);
      console.log(`✅ Index created: ${idx.name}`);
    } catch (err: any) {
      console.warn(`⚠️  Index ${idx.name}: ${err.message}`);
    }
  }

  await sequelize.close();
  console.log('Done.');
}

addIndexes().catch(console.error);
