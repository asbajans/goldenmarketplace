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
import IntegrationLog from './IntegrationLog';
import ProductVariant from './ProductVariant';
import Variation from './Variation';
import VariationOption from './VariationOption';
import Order from './Order';
import { OrderItem } from './Order';
import Wishlist from './Wishlist';
import UserAddress from './UserAddress';

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

// Product <-> ProductVariant (One-to-Many)
Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

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
ProductVariant.hasMany(B2BRequest, { foreignKey: 'variantId', as: 'b2bRequests' });
B2BRequest.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });

// Variation <-> VariationOption (One-to-Many)
Variation.hasMany(VariationOption, { foreignKey: 'variationId', as: 'options' });
VariationOption.belongsTo(Variation, { foreignKey: 'variationId', as: 'variation' });

// User <-> Variation (One-to-Many)
User.hasMany(Variation, { foreignKey: 'userId', as: 'variations' });
Variation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Order associations
Store.hasMany(Order, { foreignKey: 'storeId', as: 'orders' });
Order.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

User.hasMany(Order, { foreignKey: 'customerId', as: 'customerOrders' });
Order.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

User.hasMany(Order, { foreignKey: 'sellerId', as: 'sellerOrders' });
Order.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

// Order <-> OrderItem associations
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Wishlist associations
User.hasMany(Wishlist, { foreignKey: 'userId', as: 'wishlists' });
Wishlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Product.hasMany(Wishlist, { foreignKey: 'productId', as: 'wishlists' });
Wishlist.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// UserAddress associations
User.hasMany(UserAddress, { foreignKey: 'userId', as: 'addresses' });
UserAddress.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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
    B2BRequest,
    IntegrationLog,
    ProductVariant,
    Variation,
    VariationOption,
    Order,
    OrderItem,
    Wishlist,
    UserAddress
};
