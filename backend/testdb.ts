const sequelize = require('./src/config/database').default;
sequelize.query('SELECT id, title, marketplaces FROM products LIMIT 5').then((res) => {
  console.log(res[0]);
  process.exit(0);
});
