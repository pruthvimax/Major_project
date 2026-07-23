import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  unit: string;
}

export interface ITrackingEvent {
  status: string;
  message: string;
  location?: string;
  timestamp: Date;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type EscrowStatus =
  | 'none'
  | 'pending'
  | 'locked'
  | 'released'
  | 'refunded'
  | 'failed';

export interface IOrder extends Document {
  orderNumber: string;
  buyer: mongoose.Types.ObjectId;
  farmer: mongoose.Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'cash' | 'bank_transfer' | 'blockchain' | 'razorpay';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  blockchainTxHash?: string;
  blockchainOrderId?: number | null;
  buyerWalletAddress?: string;
  farmerWalletAddress?: string;
  escrowStatus: EscrowStatus;
  verificationStatus: 'unverified' | 'verified' | 'disputed' | 'resolved';
  disputeReason?: string;
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  trackingEvents: ITrackingEvent[];
  estimatedDelivery?: Date;
  deliveryDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Price cannot be negative'],
        },
        unit: {
          type: String,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'packed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'blockchain', 'razorpay'],
      required: true,
    },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    blockchainTxHash: {
      type: String,
      default: '',
    },
    blockchainOrderId: {
      type: Number,
      default: null,
    },
    buyerWalletAddress: { type: String, default: '' },
    farmerWalletAddress: { type: String, default: '' },
    escrowStatus: {
      type: String,
      enum: ['none', 'pending', 'locked', 'released', 'refunded', 'failed'],
      default: 'none',
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'disputed', 'resolved'],
      default: 'unverified',
    },
    disputeReason: {
      type: String,
      maxlength: [500, 'Dispute reason cannot exceed 500 characters'],
      default: '',
    },
    shippingAddress: {
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
        default: 'India',
      },
    },
    trackingEvents: [
      {
        status: { type: String, required: true },
        message: { type: String, required: true },
        location: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    estimatedDelivery: { type: Date },
    deliveryDate: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for queries
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ buyer: 1 });
OrderSchema.index({ farmer: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

// Generate order number before saving
OrderSchema.pre<IOrder>('save', function (next) {
  if (!this.orderNumber) {
    const prefix = 'ORD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

export default mongoose.model<IOrder>('Order', OrderSchema);