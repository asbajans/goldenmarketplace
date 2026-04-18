const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false
});

async function checkColumn() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Check if commissionRate column exists in stores table
    const result = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'commissionRate'"
    );
    console.log('Found commissionRate column:', result[0].length > 0);
    
    // Check exact case
    const result2 = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'commissionrate'"
    );
    console.log('Found commissionrate column:', result2[0].length > 0);
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkColumn();