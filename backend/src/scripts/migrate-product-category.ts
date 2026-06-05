import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Maps legacy raw category strings to admin category slugs
const CATEGORY_MAP: Record<string, string> = {
  // Turkish → admin slug
  'yüzük': 'yuzuk',
  'kolye': 'kolye',
  'bileklik': 'bileklik',
  'küpe': 'kupe',
  'bilezik': 'bilezik',
  'takı seti': 'sets',
  'taki seti': 'sets',
  'taki-seti': 'sets',
  'kolye ucu': 'kolye-ucu',
  'kolye-ucu': 'kolye-ucu',
  'saat': 'saat',
  'genel': 'genel',
  // English → admin slug
  'rings': 'yuzuk',
  'ring': 'yuzuk',
  'bracelet': 'bileklik',
  'bracelets': 'bileklik',
  'necklace': 'kolye',
  'necklaces': 'kolye',
  'earring': 'kupe',
  'earrings': 'kupe',
  'pendant': 'kolye-ucu',
  'pendants': 'kolye-ucu',
  'set': 'sets',
  'sets': 'sets',
  'general': 'genel',
  'watch': 'saat',
  // ASCII variants
  'yuzuk': 'yuzuk',
  'kupe': 'kupe',
};

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

    // 3) Create a temp mapping table with normalized keys
    await sequelize.query(`
      DROP TABLE IF EXISTS _cat_map;
      CREATE TEMP TABLE _cat_map (key TEXT PRIMARY KEY, category_id UUID);
    `);

    // Insert mapped values from CATEGORY_MAP
    for (const [raw, targetSlug] of Object.entries(CATEGORY_MAP)) {
      const [cat] = await sequelize.query(
        `SELECT id FROM categories WHERE slug = :slug LIMIT 1`,
        { replacements: { slug: targetSlug } }
      );
      if ((cat as any[]).length > 0) {
        const catId = (cat as any[])[0].id;
        await sequelize.query(
          `INSERT INTO _cat_map (key, category_id) VALUES (:key, :catId) ON CONFLICT DO NOTHING`,
          { replacements: { key: raw, catId } }
        );
        // Also add capitalized variant
        const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
        if (capitalized !== raw) {
          await sequelize.query(
            `INSERT INTO _cat_map (key, category_id) VALUES (:key, :catId) ON CONFLICT DO NOTHING`,
            { replacements: { key: capitalized, catId } }
          );
        }
      }
    }

    // 4) Match products using the mapping table
    const [mapped] = await sequelize.query(`
      UPDATE products p
      SET "categoryId" = m.category_id
      FROM _cat_map m
      WHERE p."categoryId" IS NULL
        AND LOWER(p.category) = LOWER(m.key);
    `);
    console.log(`[MigrateCategory] Matched ${mapped} products by category map.`);

    // 5) Try fuzzy matching for remaining unmatched
    const [fuzzyMatched] = await sequelize.query(`
      UPDATE products p
      SET "categoryId" = c.id
      FROM categories c
      WHERE p."categoryId" IS NULL
        AND (p.category ILIKE '%' || c.name || '%' OR c.name ILIKE '%' || p.category || '%');
    `);
    console.log(`[MigrateCategory] Fuzzy matched ${fuzzyMatched} products.`);

    // 6) Leftover unmatched products — set to 'Genel'
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

    // Show unlinked products
    const [unlinked] = await sequelize.query(`
      SELECT category, COUNT(*) FROM products WHERE "categoryId" IS NULL GROUP BY category ORDER BY COUNT(*) DESC;
    `);
    if ((unlinked as any[]).length > 0) {
      console.log('[MigrateCategory] Unlinked categories:');
      console.table(unlinked);
    }

    await sequelize.close();
    console.log('[MigrateCategory] Done.');
    process.exit(0);
  } catch (err) {
    console.error('[MigrateCategory] Error:', err);
    process.exit(1);
  }
}

main();
