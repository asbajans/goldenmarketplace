/**
 * Order Model
 * Schema for marketplace orders
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

type IOrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
type IOrderSource = 'golden' | 'trendyol' | 'hepsiburada' | 'etsy' | 'amazon' | 'other';

interface IOrderItem {
  id?: string;
  orderId: string;
  productId: string;
  variantId?: string;
  title: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

class OrderItem extends Model<IOrderItem> implements IOrderItem {
  public id!: string;
  public orderId!: string;
  public productId!: string;
  public variantId?: string;
  public title!: string;
  public sku!: string;
  public quantity!: number;
  public unitPrice!: number;
  public totalPrice!: number;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    variantId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    unitPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    totalPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'order_items',
    timestamps: true
  }
);

interface IOrder {
  id?: string;
  orderNumber: string;
  customerId: string;
  sellerId: string;
  storeId: string;
  status: IOrderStatus;
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  sellerEarnings: number;
  shippingTime: number;
  shippingDeadline?: Date;
  trackingNumber?: string;
  shippingCompany?: string;
  orderDate: Date;
  confirmedDate?: Date;
  shippedDate?: Date;
  deliveredDate?: Date;
  source: IOrderSource;
  externalOrderId?: string;
  shippingAddress?: any;
  billingAddress?: any;
  customerNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class Order extends Model<IOrder> implements IOrder {
  public id!: string;
  public orderNumber!: string;
  public customerId!: string;
  public sellerId!: string;
  public storeId!: string;
  public status!: IOrderStatus;
  public subtotal!: number;
  public shippingCost!: number;
  public totalAmount!: number;
  public commissionRate!: number;
  public commissionAmount!: number;
  public sellerEarnings!: number;
  public shippingTime!: number;
  public shippingDeadline?: Date;
  public trackingNumber?: string;
  public shippingCompany?: string;
  public orderDate!: Date;
  public confirmedDate?: Date;
  public shippedDate?: Date;
  public deliveredDate?: Date;
  public source!: IOrderSource;
  public externalOrderId?: string;
  public shippingAddress?: any;
  public billingAddress?: any;
  public customerNote?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public items?: OrderItem[];
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Unique order number with GC prefix (e.g., GC20260418143045001)'
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stores',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'),
      allowNull: false,
      defaultValue: 'pending'
    },
    subtotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Product subtotal'
    },
    shippingCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Shipping cost'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total order amount (subtotal + shippingCost)'
    },
    commissionRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10,
      comment: 'Commission percentage for this seller'
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Platform commission amount'
    },
    sellerEarnings: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Amount to be paid to seller (totalAmount - commissionAmount)'
    },
    shippingTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      comment: 'Seller-defined shipping time in days'
    },
    shippingDeadline: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Deadline for shipping (orderDate + shippingTime)'
    },
    trackingNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Shipping tracking number'
    },
    shippingCompany: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Shipping company name'
    },
    orderDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    confirmedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    shippedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deliveredDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    source: {
      type: DataTypes.ENUM('golden', 'trendyol', 'hepsiburada', 'etsy', 'amazon', 'other'),
      allowNull: false,
      defaultValue: 'golden'
    },
    externalOrderId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'External marketplace order ID'
    },
    shippingAddress: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Shipping address JSON'
    },
    billingAddress: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Billing address JSON'
    },
    customerNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Customer note for the order'
    }
  },
  {
    sequelize,
    tableName: 'orders',
    timestamps: true,
    indexes: [
      { name: 'idx_orders_orderNumber', unique: true, fields: ['orderNumber'] },
      { name: 'idx_orders_seller', fields: ['sellerId', 'status'] },
      { name: 'idx_orders_store', fields: ['storeId', 'status'] },
      { name: 'idx_orders_customer', fields: ['customerId', 'createdAt'] },
      { name: 'idx_orders_source', fields: ['source', 'status'] },
      { name: 'idx_orders_status', fields: ['status'] }
    ]
  }
);

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

export default Order;
export { Order, OrderItem };
export type { IOrderStatus as OrderStatus, IOrderSource as OrderSource };