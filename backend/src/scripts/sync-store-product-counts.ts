/**
 * Migration Script: Sync Store.totalProducts with actual product counts
 *
 * Run: npx ts-node backend/src/scripts/sync-store-product-counts.ts
 *
 * This script recalculates totalProducts for every store based on
 * the actual count of active products in the products table.
 */
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('[SyncCounts] Database connected.');

    await sequelize.query(`
      UPDATE stores s
      SET "totalProducts" = (
        SELECT COUNT(*) FROM products p
        WHERE p."storeId" = s.id
          AND p."isActive" = true
          AND (p."marketplaces" IS NULL OR p."marketplaces"::text = '[]' OR p."marketplaces"::text ILIKE '%golden%')
      )
      WHERE s."isActive" = true;
    `);

    console.log(`[SyncCounts] Store product counts updated.`);

    // Verify
    const [rows] = await sequelize.query(`
      SELECT s.id, s."storeName", s."totalProducts", actual.count AS actual_count
      FROM stores s
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as count FROM products p
        WHERE p."storeId" = s.id
          AND p."isActive" = true
          AND (p."marketplaces" IS NULL OR p."marketplaces"::text = '[]' OR p."marketplaces"::text ILIKE '%golden%')
      ) actual ON true
      WHERE s."isActive" = true
      ORDER BY s."storeName";
    `);

    console.log('\n[SyncCounts] Verification:');
    console.table(rows);

    await sequelize.close();
    console.log('[SyncCounts] Done.');
    process.exit(0);
  } catch (err) {
    console.error('[SyncCounts] Error:', err);
    process.exit(1);
  }
}

main();
