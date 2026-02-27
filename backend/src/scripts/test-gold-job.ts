
import goldPriceService from '../services/goldPriceService';
import Product from '../models/Product';
import sequelize from '../config/database';

const testJob = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Get a product
        const product = await Product.findOne();
        if (!product) {
            console.log('No products found to test.');
            return;
        }

        console.log(`Initial: ${product.title} | ${product.gramWeight}gr × ${product.milyem}‰ = ${product.priceTRY} TL / ${product.priceUSD} USD`);

        // 2. Run update
        console.log('Running update...');
        const result = await goldPriceService.updateProductPrices();
        console.log(`Updated ${result.updatedCount} products. 24K Gram: ${result.goldPrice.pricePerGramTRY} TRY`);

        // 3. Reload product
        await product.reload();
        console.log(`Updated: ${product.title} | ${product.priceTRY} TL / ${product.priceUSD} USD`);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await sequelize.close();
    }
};

testJob();
