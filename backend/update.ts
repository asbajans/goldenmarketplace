const sequelize = require('./src/config/database').default;
sequelize.query(`UPDATE products SET marketplaces = '["Golden Marketplace"]' WHERE id = '454ec437-8f1d-45e8-b654-132a1a179d2f'`).then(() => {
  console.log("Updated DB");
  process.exit(0);
});
