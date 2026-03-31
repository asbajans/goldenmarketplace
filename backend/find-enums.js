require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres123@localhost:5432/golden_marketplace', {
    dialect: 'postgres',
    logging: false
});

async function findEnums() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query(`
            SELECT typname FROM pg_type WHERE typname LIKE '%product_market%';
        `);
        fs.writeFileSync('enums_utf8.txt', JSON.stringify(results, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

findEnums();
