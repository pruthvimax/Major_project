import {
  purchaseProductOnChain,
  confirmDeliveryOnChain,
  cancelOrderOnChain,
  getUserWalletAddress,
} from './blockchainService';
import { recordTransaction } from './transactionService';

export type EscrowStatus =
  | 'none'
  | 'pending'
  | 'locked'
  | 'released'
  | 'refunded'
  | 'failed';

export interface EscrowResult {
  txHash: string;
  blockchainOrderId: number | null;
  escrowStatus: EscrowStatus;
  buyerWallet: string;
}

export const createEscrow = async (params: {
  onChainProductId: number;
  buyerEmail: string;
  amount: number;
  userId: string;
  productId?: string;
}): Promise<EscrowResult> => {
  const buyerWallet = getUserWalletAddress(params.buyerEmail);

  const result = await purchaseProductOnChain(
    params.onChainProductId,
    params.buyerEmail,
    params.amount
  );

  if (result.txHash) {
    await recordTransaction({
      txHash: result.txHash,
      from: buyerWallet,
      to: 'escrow',
      amount: params.amount,
      type: 'product_purchase',
      userId: params.userId,
      productId: params.productId,
      status: 'confirmed',
      metadata: {
        blockchainOrderId: result.blockchainOrderId,
        escrowStatus: 'locked',
      },
    });
  }

  return {
    txHash: result.txHash,
    blockchainOrderId: result.blockchainOrderId,
    escrowStatus: result.txHash ? 'locked' : 'failed',
    buyerWallet,
  };
};

export const releaseEscrow = async (params: {
  blockchainOrderId: number;
  amount: number;
  userId: string;
  orderId?: string;
  farmerEmail?: string;
}): Promise<{ txHash: string; escrowStatus: EscrowStatus }> => {
  const txHash = await confirmDeliveryOnChain(params.blockchainOrderId);

  if (txHash) {
    await recordTransaction({
      txHash,
      from: 'escrow',
      to: params.farmerEmail
        ? getUserWalletAddress(params.farmerEmail)
        : 'farmer',
      amount: params.amount,
      type: 'payment',
      userId: params.userId,
      orderId: params.orderId,
      status: 'confirmed',
      metadata: { escrowStatus: 'released' },
    });
  }

  return {
    txHash,
    escrowStatus: txHash ? 'released' : 'failed',
  };
};

export const refundEscrow = async (params: {
  blockchainOrderId: number;
  amount: number;
  userId: string;
  orderId?: string;
  buyerEmail?: string;
}): Promise<{ txHash: string; escrowStatus: EscrowStatus }> => {
  const txHash = await cancelOrderOnChain(params.blockchainOrderId);

  if (txHash) {
    await recordTransaction({
      txHash,
      from: 'escrow',
      to: params.buyerEmail
        ? getUserWalletAddress(params.buyerEmail)
        : 'buyer',
      amount: params.amount,
      type: 'refund',
      userId: params.userId,
      orderId: params.orderId,
      status: 'confirmed',
      metadata: { escrowStatus: 'refunded' },
    });
  }

  return {
    txHash,
    escrowStatus: txHash ? 'refunded' : 'failed',
  };
};
