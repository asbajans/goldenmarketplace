const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false
});

async function checkOrdersSchema() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Get detailed schema of orders table
    const result = await sequelize.query(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position"
    );
    console.log('Orders table schema:');
    console.log(JSON.stringify(result[0], null, 2));
    
    // Check for unique constraint on orderNumber
    const uniqueResult = await sequelize.query(
      "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'orders' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%orderNumber%'"
    );
    console.log('\\nUnique constraint on orderNumber:', uniqueResult[0].length > 0);
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkOrdersSchema();