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
    console.log('[MigrateCategory] Database connected.');

    // 1) Add categoryId column to products table
    await sequelize.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS "categoryId" UUID REFERENCES categories(id) ON DELETE SET NULL;
    `);
    console.log('[MigrateCategory] Added categoryId column to products.');

    // 2) Add defaultCategoryId column to external_feeds table
    await sequelize.query(`
      ALTER TABLE external_feeds
      ADD COLUMN IF NOT EXISTS "defaultCategoryId" UUID REFERENCES categories(id) ON DELETE SET NULL;
    `);
    console.log('[MigrateCategory] Added defaultCategoryId column to external_feeds.');

    // 3) Try to match existing product categories to admin categories by name
    const [matched] = await sequelize.query(`
      UPDATE products p
      SET "categoryId" = c.id
      FROM categories c
      WHERE p."categoryId" IS NULL
        AND LOWER(p.category) = LOWER(c.name);
    `);
    console.log(`[MigrateCategory] Matched ${matched} products by exact category name.`);

    const [slugMatched] = await sequelize.query(`
      UPDATE products p
      SET "categoryId" = c.id
      FROM categories c
      WHERE p."categoryId" IS NULL
        AND LOWER(p.category) = LOWER(c.slug);
    `);
    console.log(`[MigrateCategory] Matched ${slugMatched} products by slug.`);

    // 4) For unmatched products, try fuzzy matching (category name contains admin name or vice versa)
    const [fuzzyMatched] = await sequelize.query(`
      UPDATE products p
      SET "categoryId" = c.id
      FROM categories c
      WHERE p."categoryId" IS NULL
        AND (p.category ILIKE '%' || c.name || '%' OR c.name ILIKE '%' || p.category || '%');
    `);
    console.log(`[MigrateCategory] Fuzzy matched ${fuzzyMatched} products.`);

    // 5) Leftover unmatched products — set a default category if 'Genel' exists
    const [genelMatched] = await sequelize.query(`
      UPDATE products p
      SET "categoryId" = c.id
      FROM categories c
      WHERE p."categoryId" IS NULL
        AND LOWER(c.name) = 'genel';
    `);
    console.log(`[MigrateCategory] Set ${genelMatched} remaining products to 'Genel' category.`);

    // Summary
    const [summary] = await sequelize.query(`
      SELECT
        COUNT(*) AS total,
        COUNT("categoryId") AS linked,
        COUNT(*) - COUNT("categoryId") AS unlinked
      FROM products;
    `);
    console.log('[MigrateCategory] Summary:');
    console.table(summary);

    await sequelize.close();
    console.log('[MigrateCategory] Done.');
    process.exit(0);
  } catch (err) {
    console.error('[MigrateCategory] Error:', err);
    process.exit(1);
  }
}

main();
