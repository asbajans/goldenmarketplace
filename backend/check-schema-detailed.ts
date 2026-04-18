import sequelize from './src/config/database';

async function checkSchemaDetailed() {
  try {
    // Check stores table columns
    const storesResult: any = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'stores' 
      AND column_name IN ('commissionRate', 'defaultShippingDays', 'availableShippingCompanies')
    `);
    console.log('Stores columns:');
    storesResult[0].forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default}`);
    });
    
    // Check products table columns
    const productsResult: any = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name IN ('discountRate', 'discountedPrice')
    `);
    console.log('\\nProducts columns:');
    productsResult[0].forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default}`);
    });
    
    // Check orders table columns
    const ordersResult: any = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('orderNumber', 'commissionRate', 'commissionAmount', 'sellerEarnings', 'shippingTime')
    `);
    console.log('\\nOrders columns:');
    ordersResult[0].forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default}`);
    });
    
    // Check if orderNumber is unique
    const uniqueResult: any = await sequelize.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'orders' 
      AND constraint_type = 'UNIQUE' 
      AND constraint_name LIKE '%orderNumber%'
    `);
    console.log(`\\nOrderNumber unique constraint exists: ${uniqueResult[0].length > 0}`);
    
    await sequelize.close();
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchemaDetailed();