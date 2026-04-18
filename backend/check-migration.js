const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

client.connect()
  .then(() => {
    console.log('Connected to PostgreSQL');
    
    // Check if columns exist
    const checks = [
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'commissionRate'",
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'defaultShippingDays'",
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'availableShippingCompanies'",
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'discountRate'",
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'discountedPrice'",
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders')",
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'orderNumber'"
    ];
    
    let completed = 0;
    checks.forEach((check, index) => {
      client.query(check)
        .then(res => {
          completed++;
          if (index < 5) {
            console.log('Check ' + (index + 1) + ': ' + (res.rows.length > 0 ? 'EXISTS' : 'MISSING'));
          } else if (index === 5) {
            console.log('Check ' + (index + 1) + ' (orders table): ' + (res.rows[0].exists ? 'EXISTS' : 'MISSING'));
          } else if (index === 6) {
            console.log('Check ' + (index + 1) + ' (orderNumber column): ' + (res.rows.length > 0 ? 'EXISTS' : 'MISSING'));
          }
          
          if (completed === checks.length) {
            client.end();
          }
        })
        .catch(err => {
          console.error('Error in check ' + (index + 1) + ':', err.message);
          completed++;
          if (completed === checks.length) {
            client.end();
          }
        });
    });
  })
  .catch(err => {
    console.error('Connection error:', err.stack);
  });