import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  images: string[];
  farmer: mongoose.Types.ObjectId;
  location: {
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  isOrganic: boolean;
  isAvailable: boolean;
  isApproved: boolean;
  isBlocked: boolean;
  blockchainTxHash?: string;
  blockchainId?: number | null;
  verificationStatus: 'unverified' | 'verified' | 'rejected';
  farmerWalletAddress?: string;
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a product description'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      enum: ['vegetables', 'fruits', 'grains', 'dairy', 'meat', 'poultry', 'organic', 'other'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Please provide quantity'],
      min: [0, 'Quantity cannot be negative'],
    },
    unit: {
      type: String,
      required: [true, 'Please provide a unit'],
      enum: ['kg', 'g', 'lb', 'oz', 'piece', 'dozen', 'bunch', 'liter', 'gallon'],
      default: 'kg',
    },
    images: {
      type: [String],
      default: [],
    },
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      address: {
        type: String,
        required: true,
      },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    isOrganic: {
      type: Boolean,
      default: false,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockchainTxHash: {
      type: String,
      default: '',
    },
    blockchainId: {
      type: Number,
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'rejected'],
      default: 'unverified',
    },
    farmerWalletAddress: {
      type: String,
      default: '',
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ category: 1 });
ProductSchema.index({ farmer: 1 });
ProductSchema.index({ isAvailable: 1 });

export default mongoose.model<IProduct>('Product', ProductSchema);