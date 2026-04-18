import sequelize from './src/config/database';

async function checkCommissionColumn() {
  try {
    const result: any = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'commissionRate'"
    );
    console.log('Found commissionRate column:', result[0].length > 0);
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCommissionColumn();