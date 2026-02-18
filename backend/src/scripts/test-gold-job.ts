
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

        console.log(`Initial Price for ${product.title}: ${product.basePrice} TL`);
        console.log(`Gold Index: ${product.goldIndexPrice} oz`);

        // 2. Run update
        console.log('Running update...');
        await goldPriceService.updateProductPrices();

        // 3. Reload product
        await product.reload();
        console.log(`Updated Price for ${product.title}: ${product.basePrice} TL`);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await sequelize.close();
    }
};

testJob();
