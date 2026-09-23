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

export interface IStatusHistoryEntry {
  status: string;
  timestamp: Date;
}

// ── Logistics integration (Agri Agent) ─────────────────────────
export type LogisticsStatus =
  | 'PENDING'
  | 'PICKUP_ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED_DELIVERY'
  | 'RETURNED';

export const LOGISTICS_STATUSES: LogisticsStatus[] = [
  'PENDING',
  'PICKUP_ASSIGNED',
  'ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'FAILED_DELIVERY',
  'RETURNED',
];

export type SyncStatus = 'NOT_SYNCED' | 'PENDING' | 'SYNCED' | 'FAILED';

export interface IDeliveryEvent {
  status: string;
  message: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  timestamp: Date;
}

export interface IAssignedDriver {
  id?: string;
  name?: string;
  phone?: string;
}

export interface IVehicle {
  id?: string;
  number?: string;
  type?: string;
}

export interface ICurrentLocation {
  latitude?: number;
  longitude?: number;
  updatedAt?: Date;
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
  statusHistory: IStatusHistoryEntry[];
  cancellationReason?: string;
  cancelledBy?: 'buyer' | 'admin' | 'logistics';
  cancelledAt?: Date;
  estimatedDelivery?: Date;
  deliveryDate?: Date;
  notes?: string;
  // Logistics integration (Agri Agent) — all optional, additive
  assignedAgent?: string;
  assignedDriver?: IAssignedDriver;
  vehicle?: IVehicle;
  trackingId?: string;
  deliveryProvider?: string;
  deliveryPartnerId?: string;
  logisticsStatus?: LogisticsStatus | null;
  syncStatus: SyncStatus;
  syncError?: string;
  syncAttempts: number;
  lastSyncAttempt?: Date;
  lastLogisticsUpdate?: Date;
  deliveryEvents: IDeliveryEvent[];
  currentLocation?: ICurrentLocation;
  createdAt: Date;
  updatedAt: Date;
}

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      default: generateOrderNumber,
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
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    cancellationReason: { type: String, default: '' },
    cancelledBy: {
      type: String,
      enum: ['buyer', 'admin', 'logistics'],
      default: 'buyer',
    },
    cancelledAt: { type: Date },
    estimatedDelivery: { type: Date },
    deliveryDate: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },

    // ── Logistics integration (Agri Agent / Supabase) ──────────
    // MongoDB stays the source of truth for the order; these fields mirror
    // delivery state pushed back by Agri Agent via the status callback.
    assignedAgent: { type: String, default: '' },
    assignedDriver: {
      id: { type: String, default: '' },
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    vehicle: {
      id: { type: String, default: '' },
      number: { type: String, default: '' },
      type: { type: String, default: '' },
    },
    trackingId: { type: String, default: '' },
    deliveryProvider: { type: String, default: '' },
    deliveryPartnerId: { type: String, default: '' },
    logisticsStatus: {
      type: String,
      enum: [...LOGISTICS_STATUSES, null],
      default: null,
    },
    syncStatus: {
      type: String,
      enum: ['NOT_SYNCED', 'PENDING', 'SYNCED', 'FAILED'],
      default: 'NOT_SYNCED',
    },
    syncError: { type: String, default: '' },
    syncAttempts: { type: Number, default: 0 },
    lastSyncAttempt: { type: Date },
    lastLogisticsUpdate: { type: Date },
    deliveryEvents: [
      {
        status: { type: String, required: true },
        message: { type: String, default: '' },
        location: { type: String, default: '' },
        latitude: { type: Number },
        longitude: { type: Number },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    currentLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      updatedAt: { type: Date },
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
OrderSchema.index({ logisticsStatus: 1 });
OrderSchema.index({ syncStatus: 1 });

// Ensure a unique order number exists before validation/save
OrderSchema.pre<IOrder>('validate', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = generateOrderNumber();
  }
  next();
});

OrderSchema.pre<IOrder>('save', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = generateOrderNumber();
  }
  next();
});

export default mongoose.model<IOrder>('Order', OrderSchema);