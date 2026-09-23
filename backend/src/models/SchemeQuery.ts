import mongoose, { Schema, Document } from 'mongoose';

export const SCHEME_QUERY_STATUSES = ['open', 'answered', 'resolved'] as const;

export type SchemeQueryStatus = (typeof SCHEME_QUERY_STATUSES)[number];

export interface ISchemeQuery extends Document {
  scheme: mongoose.Types.ObjectId;
  farmer: mongoose.Types.ObjectId;
  question: string;
  status: SchemeQueryStatus;
  adminResponse?: string;
  respondedBy?: mongoose.Types.ObjectId;
  respondedAt?: Date | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SchemeQuerySchema = new Schema<ISchemeQuery>(
  {
    scheme: {
      type: Schema.Types.ObjectId,
      ref: 'Scheme',
      required: true,
      index: true,
    },
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Please enter your question'],
      trim: true,
      minlength: [5, 'Question is too short'],
      maxlength: [1000, 'Question cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: SCHEME_QUERY_STATUSES,
      default: 'open',
      index: true,
    },
    adminResponse: {
      type: String,
      trim: true,
      default: '',
      maxlength: [3000, 'Response cannot exceed 3000 characters'],
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'schemeQueries',
  }
);

export default mongoose.model<ISchemeQuery>('SchemeQuery', SchemeQuerySchema);
