import mongoose from 'mongoose';
import Transaction, { ITransaction } from '../models/Transaction';
import Order from '../models/Order';
import { getUserWalletAddress, getTransactionReceiptOnChain } from './blockchainService';

/**
 * Blockchain Transaction History
 *
 * Read-only view over the existing `Transaction` collection. It does NOT create
 * new blockchain logic — it joins the records that productController /
 * escrowService already write (via recordTransaction) with their Order,
 * Product and User documents and normalises them into one shape the app can
 * render. Nothing here writes to the chain.
 */

export type HistoryType =
  | 'product_registration'
  | 'escrow_created'
  | 'payment_released'
  | 'refund_issued'
  | 'order_cancelled';

export type ViewerRole = 'farmer' | 'buyer' | 'admin';

export interface TransactionHistoryItem {
  id: string;
  txHash: string;
  type: HistoryType;
  typeLabel: string;
  blockchainStatus: 'pending' | 'confirmed' | 'failed';
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
  /** The wallet most relevant to this event (farmer for listings/releases, buyer for escrow/refunds). */
  walletAddress: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  currency: string;
  /** Mock on-chain value — blockchainService.ethToWei uses 1 unit = 0.001 ETH. */
  amountEth: number;
  paymentMethod: string;
  createdAt: Date;
  confirmedAt: Date | null;
}

const TYPE_LABELS: Record<HistoryType, string> = {
  product_registration: 'Product Registration',
  escrow_created: 'Escrow Created',
  payment_released: 'Payment Released',
  refund_issued: 'Refund Issued',
  order_cancelled: 'Order Cancelled',
};

/** Maps the stored Transaction.type to the presentation type used by the app. */
const toHistoryType = (tx: ITransaction, order: any | null): HistoryType => {
  switch (tx.type) {
    case 'product_listing':
      return 'product_registration';
    case 'product_purchase':
      return 'escrow_created';
    case 'payment':
      return 'payment_released';
    case 'refund':
      // A refund triggered by an admin cancellation is presented as "Order Cancelled".
      return order && order.status === 'cancelled' && order.cancelledBy === 'admin'
        ? 'order_cancelled'
        : 'refund_issued';
    default:
      return 'escrow_created';
  }
};

const isHexAddress = (value: unknown): value is string =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);

const idEquals = (a: unknown, b: unknown): boolean => {
  if (!a || !b) return false;
  const aId = typeof a === 'object' && a !== null && '_id' in (a as any) ? (a as any)._id : a;
  const bId = typeof b === 'object' && b !== null && '_id' in (b as any) ? (b as any)._id : b;
  return String(aId) === String(bId);
};

const walletFor = (user: any, stored?: string): string => {
  if (isHexAddress(stored)) return stored;
  if (user && isHexAddress(user.walletAddress)) return user.walletAddress;
  if (user && typeof user.email === 'string') return getUserWalletAddress(user.email);
  return '';
};

const normalise = (tx: any, order: any | null): TransactionHistoryItem => {
  const product = tx.productId && typeof tx.productId === 'object' ? tx.productId : null;
  const actor = tx.userId && typeof tx.userId === 'object' ? tx.userId : null;

  const orderBuyer = order && typeof order.buyer === 'object' ? order.buyer : null;
  const orderFarmer = order && typeof order.farmer === 'object' ? order.farmer : null;
  const productFarmer = product && typeof product.farmer === 'object' ? product.farmer : null;

  const buyer = orderBuyer || (tx.type === 'product_purchase' ? actor : null);
  const farmer = orderFarmer || productFarmer || (tx.type === 'product_listing' ? actor : null);

  const type = toHistoryType(tx, order);
  const buyerWallet = walletFor(buyer, order?.buyerWalletAddress);
  const farmerWallet = walletFor(farmer, order?.farmerWalletAddress || product?.farmerWalletAddress);

  const metadata = tx.metadata || {};
  const blockchainOrderId =
    typeof metadata.blockchainOrderId === 'number'
      ? metadata.blockchainOrderId
      : order && typeof order.blockchainOrderId === 'number'
        ? order.blockchainOrderId
        : null;

  const productName =
    (product && product.name) ||
    (typeof metadata.name === 'string' ? metadata.name : '') ||
    (order && Array.isArray(order.items) && order.items[0]?.product?.name) ||
    '';

  const amount = typeof tx.amount === 'number' ? tx.amount : 0;

  return {
    id: String(tx._id),
    txHash: tx.txHash,
    type,
    typeLabel: TYPE_LABELS[type],
    blockchainStatus: tx.status,
    escrowStatus:
      (typeof metadata.escrowStatus === 'string' && metadata.escrowStatus) ||
      (order && order.escrowStatus) ||
      (type === 'product_registration' ? 'n/a' : 'none'),
    blockNumber: typeof tx.blockNumber === 'number' ? tx.blockNumber : null,
    blockchainOrderId,
    blockchainProductId:
      typeof metadata.blockchainId === 'number'
        ? metadata.blockchainId
        : product && typeof product.blockchainId === 'number'
          ? product.blockchainId
          : null,
    orderId: order ? String(order._id) : null,
    orderNumber: order?.orderNumber || '',
    orderStatus: order?.status || '',
    productName,
    buyerName: buyer?.name || '',
    farmerName: farmer?.name || '',
    buyerWallet,
    farmerWallet,
    walletAddress:
      type === 'product_registration' || type === 'payment_released' ? farmerWallet : buyerWallet,
    fromAddress: tx.from || '',
    toAddress: tx.to || '',
    amount,
    currency: 'INR',
    amountEth: Number((amount * 0.001).toFixed(6)),
    paymentMethod: order?.paymentMethod || 'blockchain',
    createdAt: tx.createdAt,
    confirmedAt: tx.confirmedAt || null,
  };
};

const ORDER_SELECT =
  'orderNumber status paymentMethod escrowStatus blockchainOrderId buyerWalletAddress farmerWalletAddress cancelledBy buyer farmer items';

const loadTransactions = async (baseQuery: Record<string, any>, limit: number) => {
  const txs = await Transaction.find(baseQuery)
    .populate('userId', 'name email role walletAddress')
    .populate({
      path: 'orderId',
      select: ORDER_SELECT,
      populate: [
        { path: 'buyer', select: 'name email walletAddress' },
        { path: 'farmer', select: 'name email walletAddress' },
        { path: 'items.product', select: 'name' },
      ],
    })
    .populate({
      path: 'productId',
      select: 'name blockchainId farmerWalletAddress farmer',
      populate: { path: 'farmer', select: 'name email walletAddress' },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Escrow-creation records are written before the Order document exists, so
  // they carry metadata.blockchainOrderId instead of orderId. Resolve those in
  // one query so every card can show its order number.
  const pendingChainIds = new Set<number>();
  for (const tx of txs) {
    const chainId = tx.metadata?.blockchainOrderId;
    if (!tx.orderId && typeof chainId === 'number') pendingChainIds.add(chainId);
  }

  const ordersByChainId = new Map<number, any>();
  if (pendingChainIds.size > 0) {
    const orders = await Order.find({ blockchainOrderId: { $in: Array.from(pendingChainIds) } })
      .select(ORDER_SELECT)
      .populate('buyer', 'name email walletAddress')
      .populate('farmer', 'name email walletAddress')
      .populate('items.product', 'name')
      .lean();
    for (const order of orders) {
      if (typeof order.blockchainOrderId === 'number') ordersByChainId.set(order.blockchainOrderId, order);
    }
  }

  return txs.map((tx: any) => {
    const order =
      tx.orderId && typeof tx.orderId === 'object'
        ? tx.orderId
        : typeof tx.metadata?.blockchainOrderId === 'number'
          ? ordersByChainId.get(tx.metadata.blockchainOrderId) || null
          : null;
    return { tx, order };
  });
};

const visibleTo = (role: ViewerRole, userId: string, tx: any, order: any | null): boolean => {
  if (role === 'admin') return true;
  if (idEquals(tx.userId, userId)) return true;
  if (role === 'buyer') return !!order && idEquals(order.buyer, userId);
  // farmer
  if (order && idEquals(order.farmer, userId)) return true;
  const product = tx.productId && typeof tx.productId === 'object' ? tx.productId : null;
  return !!product && idEquals(product.farmer, userId);
};

export interface HistoryFilters {
  type?: HistoryType | 'all';
  search?: string;
  limit?: number;
}

export const getTransactionHistoryForUser = async (
  role: ViewerRole,
  userId: string | mongoose.Types.ObjectId,
  filters: HistoryFilters = {}
): Promise<TransactionHistoryItem[]> => {
  const limit = Math.min(Math.max(filters.limit || 200, 1), 500);
  const rows = await loadTransactions({}, limit);
  const me = String(userId);

  let items = rows
    .filter(({ tx, order }) => visibleTo(role, me, tx, order))
    .map(({ tx, order }) => normalise(tx, order));

  if (filters.type && filters.type !== 'all') {
    items = items.filter((item) => item.type === filters.type);
  }

  const search = (filters.search || '').trim().toLowerCase();
  if (search) {
    items = items.filter(
      (item) =>
        item.txHash.toLowerCase().includes(search) ||
        item.orderNumber.toLowerCase().includes(search) ||
        item.buyerName.toLowerCase().includes(search) ||
        item.farmerName.toLowerCase().includes(search) ||
        item.productName.toLowerCase().includes(search)
    );
  }

  return items;
};

export const getTransactionDetailForUser = async (
  role: ViewerRole,
  userId: string | mongoose.Types.ObjectId,
  txHash: string
): Promise<TransactionHistoryItem | null> => {
  const rows = await loadTransactions({ txHash }, 1);
  if (rows.length === 0) return null;

  const { tx, order } = rows[0];
  if (!visibleTo(role, String(userId), tx, order)) return null;

  // Existing writers never stored blockNumber; fetch the receipt once and
  // persist it so the detail modal can show it (best effort, never throws).
  if (typeof tx.blockNumber !== 'number') {
    const receipt = await getTransactionReceiptOnChain(txHash);
    if (receipt && typeof receipt.blockNumber === 'number') {
      tx.blockNumber = receipt.blockNumber;
      await Transaction.updateOne(
        { _id: tx._id },
        { $set: { blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed } }
      ).catch((error) => console.error('Failed to persist block number:', error));
    }
  }

  return normalise(tx, order);
};
