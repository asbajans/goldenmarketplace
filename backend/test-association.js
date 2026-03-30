const { Product, ProductVariant } = require('./src/models');
const sequelize = require('./src/config/database');

async function testFetch() {
  try {
    await sequelize.authenticate();
    console.log('Connected.');
    
    // Check if models are associated
    const product = await Product.findOne({
      include: [{ model: ProductVariant, as: 'variants' }]
    });
    console.log('Fetch successful:', !!product);
  } catch (err) {
    console.error('Fetch failed:', err.message);
    if (err.name === 'SequelizeEagerLoadingError') {
       console.log('ASSOCIATION ERROR: Variants not recognized on Product.');
    }
  } finally {
    process.exit();
  }
}

testFetch();
