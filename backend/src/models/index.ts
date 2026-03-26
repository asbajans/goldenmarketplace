import User from './User';
import Store from './Store';
import Product from './Product';
import Category from './Category';
import SubscriptionPlan from './SubscriptionPlan';
import Subscription from './Subscription';
import Integration from './Integration';
import MarketplaceIntegration from './MarketplaceIntegration';
import GlobalSetting from './GlobalSetting';
import ProductMarketplaceListing from './ProductMarketplaceListing';
import B2BRequest from './B2BRequest';

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

// Product <-> ProductMarketplaceListing (One-to-Many)
Product.hasMany(ProductMarketplaceListing, { foreignKey: 'productId', as: 'marketplaceListings' });
ProductMarketplaceListing.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// B2BRequest associations
Product.hasMany(B2BRequest, { foreignKey: 'productId', as: 'b2bRequests' });
B2BRequest.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Store.hasMany(B2BRequest, { foreignKey: 'requesterStoreId', as: 'outgoingB2BRequests' });
B2BRequest.belongsTo(Store, { foreignKey: 'requesterStoreId', as: 'requesterStore' });
Store.hasMany(B2BRequest, { foreignKey: 'ownerStoreId', as: 'incomingB2BRequests' });
B2BRequest.belongsTo(Store, { foreignKey: 'ownerStoreId', as: 'ownerStore' });

// Export all models
export {
    User,
    Store,
    Product,
    Category,
    SubscriptionPlan,
    Subscription,
    Integration,
    MarketplaceIntegration,
    GlobalSetting,
    ProductMarketplaceListing,
    B2BRequest
};
