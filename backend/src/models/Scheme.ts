import mongoose, { Schema, Document } from 'mongoose';

export const SCHEME_CATEGORIES = [
  'PM-KISAN',
  'Crop Insurance',
  'Subsidies',
  'Equipment Assistance',
  'Irrigation Support',
  'State Government Schemes',
  'Organic Farming Support',
  'Other',
] as const;

export type SchemeCategory = (typeof SCHEME_CATEGORIES)[number];

export const SCHEME_LABELS = ['new', 'popular', 'expiring_soon'] as const;

export type SchemeLabel = (typeof SCHEME_LABELS)[number];

export interface IScheme extends Document {
  name: string;
  description: string;
  benefits: string;
  eligibility: string;
  requiredDocuments: string[];
  applicationDeadline?: Date | null;
  officialWebsite?: string;
  contactNumber?: string;
  category: SchemeCategory;
  isActive: boolean;
  labels: SchemeLabel[];
  viewCount: number;
  savedBy: mongoose.Types.ObjectId[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SchemeSchema = new Schema<IScheme>(
  {
    name: {
      type: String,
      required: [true, 'Please provide the scheme name'],
      trim: true,
      maxlength: [150, 'Scheme name cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true,
      maxlength: [4000, 'Description cannot exceed 4000 characters'],
    },
    benefits: {
      type: String,
      trim: true,
      default: '',
      maxlength: [3000, 'Benefits cannot exceed 3000 characters'],
    },
    eligibility: {
      type: String,
      required: [true, 'Please provide the eligibility criteria'],
      trim: true,
      maxlength: [3000, 'Eligibility cannot exceed 3000 characters'],
    },
    requiredDocuments: {
      type: [String],
      default: [],
    },
    applicationDeadline: {
      type: Date,
      default: null,
    },
    officialWebsite: {
      type: String,
      trim: true,
      default: '',
    },
    contactNumber: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: SCHEME_CATEGORIES,
      required: [true, 'Please select a category'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    labels: {
      type: [{ type: String, enum: SCHEME_LABELS }],
      default: [],
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    savedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'schemes',
  }
);

SchemeSchema.index({ name: 'text', description: 'text', eligibility: 'text' });

export default mongoose.model<IScheme>('Scheme', SchemeSchema);
