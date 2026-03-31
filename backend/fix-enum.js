require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres123@localhost:5432/golden_marketplace', {
    dialect: 'postgres',
    logging: false
});

async function addEtsyToEnum() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Add 'etsy'
        try {
            await sequelize.query(`ALTER TYPE "enum_product_marketplace_listings_platform" ADD VALUE 'etsy';`);
            console.log("Added 'etsy' to enum successfully.");
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log("'etsy' already exists in enum.");
            } else {
                console.error("Failed to add 'etsy':", e.message);
            }
        }

        // Add 'amazon'
        try {
            await sequelize.query(`ALTER TYPE "enum_product_marketplace_listings_platform" ADD VALUE 'amazon';`);
            console.log("Added 'amazon' to enum successfully.");
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log("'amazon' already exists in enum.");
            } else {
                console.error("Failed to add 'amazon':", e.message);
            }
        }

    } catch (error) {
        console.error('Database connection failed:', error.message);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

addEtsyToEnum();
