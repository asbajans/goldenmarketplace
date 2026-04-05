import sequelize from '../config/database';
import { Product } from '../models';
import { s3Service } from '../services/s3Service';

async function migrateImagesToMinIO() {
  try {
    await sequelize.authenticate();
    console.log('[Migration] Connected to database.');

    // Fetch all products that have custom images
    const products = await Product.findAll({
      attributes: ['id', 'storeId', 'images', 'title'],
    });

    console.log(`[Migration] Found ${products.length} total products to check.`);

    let migratedCount = 0;
    
    for (const product of products) {
      const originalImages = product.images;

      if (!originalImages || !Array.isArray(originalImages) || originalImages.length === 0) {
        continue;
      }

      let needsUpdate = false;
      const newImages: string[] = [];

      for (const img of originalImages) {
        // Assume it's a base64 string if it contains data:image OR if it's very long and NOT an http link
        if (img.startsWith('data:image') || (img.length > 500 && !img.startsWith('http'))) {
          console.log(`[Migration] Migrating base64 image for product: ${product.title}`);
          const s3Url = await s3Service.uploadBase64Image(img, `products/${product.storeId}`);
          newImages.push(s3Url);
          needsUpdate = true;
        } else {
          // It's already a URL
          newImages.push(img);
        }
      }

      if (needsUpdate) {
        await product.update({ images: newImages });
        console.log(`[Migration] ✅ Product ${product.id} updated with MinIO URLs.`);
        migratedCount++;
      }
    }

    console.log(`\n[Migration] COMPLETED! Migrated ${migratedCount} products to MinIO.`);
    process.exit(0);

  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    process.exit(1);
  }
}

migrateImagesToMinIO();
