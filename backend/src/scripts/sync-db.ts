
import sequelize from '../config/database';
import '../models';

const syncDb = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync models - alter table to add columns without dropping
        console.log(`Syncing all models...`);
        await sequelize.sync({ alter: true });
        console.log('Database synced successfully.');

    } catch (error) {
        console.error('Unable to sync database:', error);
    } finally {
        await sequelize.close();
    }
};

syncDb();
