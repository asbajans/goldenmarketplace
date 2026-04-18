import sequelize from './src/config/database';

async function checkSchema() {
  try {
    // Check stores table
    const storesResult: any = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'commissionRate'"
    );
    console.log('Stores commissionRate column exists:', storesResult[0].length > 0);
    
    // Check products table
    const productsResult: any = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'discountRate'"
    );
    console.log('Products discountRate column exists:', productsResult[0].length > 0);
    
    // Check if orders table exists
    const ordersResult: any = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders')"
    );
    console.log('Orders table exists:', ordersResult[0][0].exists);
    
    await sequelize.close();
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchema();