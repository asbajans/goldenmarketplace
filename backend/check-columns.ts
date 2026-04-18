import sequelize from './src/config/database';
import './src/models';

async function checkColumns() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Check stores table for commissionRate
    const [storesResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'commissionRate'"
    );
    console.log('Stores table commissionRate column:', storesResults.length > 0 ? 'EXISTS' : 'MISSING');
    if (storesResults.length > 0) {
      console.log('Details:', storesResults[0]);
    }

    // Check stores table for defaultShippingDays
    const [shippingDaysResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'defaultShippingDays'"
    );
    console.log('Stores table defaultShippingDays column:', shippingDaysResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check stores table for availableShippingCompanies
    const [shippingCompaniesResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'availableShippingCompanies'"
    );
    console.log('Stores table availableShippingCompanies column:', shippingCompaniesResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check products table for discountRate
    const [productsResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'discountRate'"
    );
    console.log('Products table discountRate column:', productsResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check products table for discountedPrice
    const [discountedPriceResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'discountedPrice'"
    );
    console.log('Products table discountedPrice column:', discountedPriceResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for orderNumber
    const [orderNumberResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'orderNumber'"
    );
    console.log('Orders table orderNumber column:', orderNumberResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for commissionRate
    const [orderCommissionResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'commissionRate'"
    );
    console.log('Orders table commissionRate column:', orderCommissionResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for commissionAmount
    const [orderCommissionAmountResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'commissionAmount'"
    );
    console.log('Orders table commissionAmount column:', orderCommissionAmountResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for sellerEarnings
    const [orderSellerEarningsResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'sellerEarnings'"
    );
    console.log('Orders table sellerEarnings column:', orderSellerEarningsResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for shippingTime
    const [orderShippingTimeResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shippingTime'"
    );
    console.log('Orders table shippingTime column:', orderShippingTimeResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for shippingDeadline
    const [orderShippingDeadlineResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shippingDeadline'"
    );
    console.log('Orders table shippingDeadline column:', orderShippingDeadlineResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for trackingNumber
    const [orderTrackingNumberResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'trackingNumber'"
    );
    console.log('Orders table trackingNumber column:', orderTrackingNumberResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for shippingCompany
    const [orderShippingCompanyResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shippingCompany'"
    );
    console.log('Orders table shippingCompany column:', orderShippingCompanyResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for source
    const [orderSourceResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'source'"
    );
    console.log('Orders table source column:', orderSourceResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for externalOrderId
    const [orderExternalOrderIdResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'externalOrderId'"
    );
    console.log('Orders table externalOrderId column:', orderExternalOrderIdResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for shippingAddress
    const [orderShippingAddressResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shippingAddress'"
    );
    console.log('Orders table shippingAddress column:', orderShippingAddressResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for billingAddress
    const [orderBillingAddressResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'billingAddress'"
    );
    console.log('Orders table billingAddress column:', orderBillingAddressResults.length > 0 ? 'EXISTS' : 'MISSING');

    // Check orders table for customerNote
    const [orderCustomerNoteResults] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customerNote'"
    );
    console.log('Orders table customerNote column:', orderCustomerNoteResults.length > 0 ? 'EXISTS' : 'MISSING');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkColumns();