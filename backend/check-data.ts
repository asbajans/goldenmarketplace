import sequelize from './src/config/database';

async function checkData() {
  try {
    // Check stores table data
    const storesResult: any = await sequelize.query(
      "SELECT id, commissionRate, defaultShippingDays, availableShippingCompanies FROM stores LIMIT 5"
    );
    console.log('Stores data:');
    console.log(JSON.stringify(storesResult[0], null, 2));
    
    // Check products table data
    const productsResult: any = await sequelize.query(
      "SELECT id, discountRate, discountedPrice FROM products LIMIT 5"
    );
    console.log('\\nProducts data:');
    console.log(JSON.stringify(productsResult[0], null, 2));
    
    // Check orders table data
    const ordersResult: any = await sequelize.query(
      "SELECT id, orderNumber, commissionRate, commissionAmount, sellerEarnings, shippingTime FROM orders LIMIT 5"
    );
    console.log('\\nOrders data:');
    console.log(JSON.stringify(ordersResult[0], null, 2));
    
    await sequelize.close();
  } catch (error) {
    console.error('Error checking data:', error);
  }
}

checkData();