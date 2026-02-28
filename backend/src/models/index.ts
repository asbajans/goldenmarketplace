import User from './User';
import Store from './Store';
import Product from './Product';
import Category from './Category';
import SubscriptionPlan from './SubscriptionPlan';
import Subscription from './Subscription';
import Integration from './Integration';
import MarketplaceIntegration from './MarketplaceIntegration';

// User <-> Store (One-to-One)
User.hasOne(Store, { foreignKey: 'userId', as: 'store' });
Store.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Store <-> Product (One-to-Many)
Store.hasMany(Product, { foreignKey: 'storeId', as: 'products' });
Product.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// Store <-> Integration (One-to-Many)
Store.hasMany(Integration, { foreignKey: 'storeId', as: 'integrations' });
Integration.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// User <-> Subscription (One-to-Many)
User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Export all models
export {
    User,
    Store,
    Product,
    Category,
    SubscriptionPlan,
    Subscription,
    Integration,
    MarketplaceIntegration
};
