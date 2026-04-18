import sequelize from './src/config/database';

async function checkStoreColumns() {
  try {
    const result: any = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'stores'"
    );
    console.log('Store columns:', result[0].map((r: any) => r.column_name));
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkStoreColumns();