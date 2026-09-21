/**
 * Blockchain Transaction History — shared types.
 * Mirrors `TransactionHistoryItem` returned by GET /api/transactions.
 */

export type TransactionType =
  | 'product_registration'
  | 'escrow_created'
  | 'payment_released'
  | 'refund_issued'
  | 'order_cancelled';

export type TransactionTypeFilter = 'all' | TransactionType;

export type BlockchainStatus = 'pending' | 'confirmed' | 'failed';

export interface TransactionRecord {
  id: string;
  txHash: string;
  type: TransactionType;
  typeLabel: string;
  blockchainStatus: BlockchainStatus;
  escrowStatus: string;
  blockNumber: number | null;
  blockchainOrderId: number | null;
  blockchainProductId: number | null;
  orderId: string | null;
  orderNumber: string;
  orderStatus: string;
  productName: string;
  buyerName: string;
  farmerName: string;
  buyerWallet: string;
  farmerWallet: string;
  walletAddress: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  currency: string;
  amountEth: number;
  paymentMethod: string;
  createdAt: string;
  confirmedAt: string | null;
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  product_registration: 'Product Registration',
  escrow_created: 'Escrow Created',
  payment_released: 'Payment Released',
  refund_issued: 'Refund Issued',
  order_cancelled: 'Order Cancelled',
};

export const TRANSACTION_FILTERS: { label: string; value: TransactionTypeFilter }[] = [
  { label: 'All Transactions', value: 'all' },
  { label: 'Escrow Created', value: 'escrow_created' },
  { label: 'Payment Released', value: 'payment_released' },
  { label: 'Refund Issued', value: 'refund_issued' },
  { label: 'Product Registration', value: 'product_registration' },
  { label: 'Order Cancelled', value: 'order_cancelled' },
];
