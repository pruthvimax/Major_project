import { Request, Response } from 'express';
import {
  getTransactionHistoryForUser,
  getTransactionDetailForUser,
  HistoryType,
  ViewerRole,
} from '../services/transactionHistoryService';

interface AuthRequest extends Request {
  user?: any;
}

const HISTORY_TYPES: (HistoryType | 'all')[] = [
  'all',
  'product_registration',
  'escrow_created',
  'payment_released',
  'refund_issued',
  'order_cancelled',
];

// @desc    Blockchain transaction history for the logged-in user (admin sees all)
// @route   GET /api/transactions?type=&search=&limit=
// @access  Private (farmer | buyer | admin)
export const getTransactionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = req.user?.role as ViewerRole;
    const userId = req.user?._id;

    const rawType = typeof req.query.type === 'string' ? req.query.type : 'all';
    const type = HISTORY_TYPES.includes(rawType as HistoryType) ? (rawType as HistoryType | 'all') : 'all';
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;

    const transactions = await getTransactionHistoryForUser(role, userId, { type, search, limit });

    res.status(200).json({
      success: true,
      count: transactions.length,
      role,
      transactions,
    });
  } catch (error: any) {
    console.error('Get transaction history error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Single transaction detail (includes block number when available)
// @route   GET /api/transactions/:txHash
// @access  Private (only the buyer/farmer involved, or admin)
export const getTransactionDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { txHash } = req.params;
    if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      res.status(400).json({ success: false, message: 'Invalid transaction hash' });
      return;
    }

    const transaction = await getTransactionDetailForUser(req.user?.role, req.user?._id, txHash);
    if (!transaction) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    res.status(200).json({ success: true, transaction });
  } catch (error: any) {
    console.error('Get transaction detail error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
