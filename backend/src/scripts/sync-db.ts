
import sequelize from '../config/database';
import User from '../models/User';
import Store from '../models/Store';
import Product from '../models/Product';
// Import other models if any

const syncDb = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync models - alter table to add columns without dropping
        console.log(`Syncing models for: ${User.name}, ${Store.name}, ${Product.name}`);
        await sequelize.sync({ alter: true });
        console.log('Database synced successfully.');

    } catch (error) {
        console.error('Unable to sync database:', error);
    } finally {
        await sequelize.close();
    }
};

syncDb();
