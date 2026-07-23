import Transaction from '../models/Transaction';
import mongoose from 'mongoose';

export type TxType = 'product_purchase' | 'product_listing' | 'payment' | 'refund';

interface RecordTxInput {
  txHash: string;
  from: string;
  to: string;
  amount: number;
  type: TxType;
  userId: string | mongoose.Types.ObjectId;
  orderId?: string | mongoose.Types.ObjectId;
  productId?: string | mongoose.Types.ObjectId;
  status?: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  metadata?: Record<string, any>;
}

export const recordTransaction = async (input: RecordTxInput) => {
  if (!input.txHash) return null;

  try {
    const existing = await Transaction.findOne({ txHash: input.txHash });
    if (existing) {
      existing.status = input.status || 'confirmed';
      if (input.blockNumber) existing.blockNumber = input.blockNumber;
      existing.confirmedAt = new Date();
      await existing.save();
      return existing;
    }

    return await Transaction.create({
      txHash: input.txHash,
      from: input.from,
      to: input.to,
      amount: input.amount,
      currency: 'ETH',
      type: input.type,
      status: input.status || 'confirmed',
      blockNumber: input.blockNumber,
      orderId: input.orderId,
      productId: input.productId,
      userId: input.userId,
      metadata: input.metadata || {},
      confirmedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to record transaction:', error);
    return null;
  }
};

export const getTransactions = async (filters: {
  userId?: string;
  orderId?: string;
  productId?: string;
  type?: TxType;
  limit?: number;
} = {}) => {
  const query: any = {};
  if (filters.userId) query.userId = filters.userId;
  if (filters.orderId) query.orderId = filters.orderId;
  if (filters.productId) query.productId = filters.productId;
  if (filters.type) query.type = filters.type;

  return Transaction.find(query)
    .populate('userId', 'name email role')
    .populate('orderId', 'orderNumber status totalAmount')
    .populate('productId', 'name blockchainId')
    .sort({ createdAt: -1 })
    .limit(filters.limit || 100);
};

export const getTransactionStats = async () => {
  const [total, confirmed, listings, purchases, refunds] = await Promise.all([
    Transaction.countDocuments(),
    Transaction.countDocuments({ status: 'confirmed' }),
    Transaction.countDocuments({ type: 'product_listing' }),
    Transaction.countDocuments({ type: 'product_purchase' }),
    Transaction.countDocuments({ type: 'refund' }),
  ]);

  return { total, confirmed, listings, purchases, refunds };
};
