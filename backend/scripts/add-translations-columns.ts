/**
 * Migration: Add translations columns to existing tables
 * Run: npx ts-node src/scripts/add-translations-columns.ts
 */

import sequelize from '../src/config/database';
import Product from '../src/models/Product';
import Category from '../src/models/Category';
import Store from '../src/models/Store';

async function migrate() {
  console.log('Starting migration: adding translations columns...');
  
  try {
    // Add translations to Categories table
    await sequelize.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';
    `);
    console.log('✓ Categories table updated');

    // Add translations and defaultLanguage to Products table
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "defaultLanguage" VARCHAR(10) DEFAULT 'en';
    `);
    console.log('✓ Products table updated');

    // Add defaultLanguage and openAiApiKey to Stores table
    await sequelize.query(`
      ALTER TABLE stores 
      ADD COLUMN IF NOT EXISTS "defaultLanguage" VARCHAR(10) DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS "openAiApiKey" VARCHAR(256);
    `);
    console.log('✓ Stores table updated');

    // Add English translations to existing categories
    const categories = await Category.findAll();
    const categoryTranslations: Record<string, { en: string; tr: string }> = {
      'Yüzük': { en: 'Rings', tr: 'Yüzükler' },
      'Kolye': { en: 'Necklaces', tr: 'Kolyeler' },
      'Bilezik': { en: 'Bracelets', tr: 'Bilezikler' },
      'Küpe': { en: 'Earrings', tr: 'Küpeler' },
      'Pendant': { en: 'Pendants', tr: 'Pandantifler' },
      'Set': { en: 'Sets', tr: 'Setler' },
    };

    for (const cat of categories) {
      const translation = categoryTranslations[cat.name];
      if (translation) {
        await cat.update({
          translations: {
            en: { name: translation.en, description: cat.description || '' },
            tr: { name: translation.tr, description: cat.description || '' }
          }
        });
      }
    }
    console.log('✓ Category translations updated');

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();