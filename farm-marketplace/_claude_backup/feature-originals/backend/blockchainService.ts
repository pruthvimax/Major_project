import { ethers } from 'ethers';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface ContractDetails {
  address: string;
  abi: any[];
}

let provider: ethers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;
let contract: ethers.Contract | null = null;
let isBlockchainEnabled = false;

try {
  const nodeUrl = process.env.ETHEREUM_NODE_URL || process.env.BLOCKCHAIN_RPC_URL;
  const privateKey = process.env.ETHEREUM_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const contractDetailsPath = path.join(__dirname, '../config/contractDetails.json');

  if (nodeUrl && privateKey && fs.existsSync(contractDetailsPath)) {
    const details: ContractDetails = JSON.parse(fs.readFileSync(contractDetailsPath, 'utf8'));
    const contractAddress = process.env.CONTRACT_ADDRESS || details.address;

    provider = new ethers.JsonRpcProvider(nodeUrl);
    wallet = new ethers.Wallet(privateKey, provider);
    contract = new ethers.Contract(contractAddress, details.abi, wallet);
    isBlockchainEnabled = true;

    console.log(`🔗 Blockchain Service Initialized`);
    console.log(`🔗 Contract Address: ${contractAddress}`);
    console.log(`🔗 Relayer Address: ${wallet.address}`);
  } else {
    console.warn(`⚠️ Blockchain configuration missing or local Hardhat node not running. Running in database-only mode.`);
  }
} catch (error) {
  console.error(`❌ Failed to initialize Blockchain Service:`, error);
}

// Generate a deterministic Ethereum address from user email
export const getUserWalletAddress = (email: string): string => {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(email));
  return '0x' + hash.slice(2, 42).toLowerCase();
};

// Convert database units to Wei (1 unit = 0.001 ETH for mock demonstration)
export const ethToWei = (ethAmount: number): bigint => {
  const ethValue = (ethAmount * 0.001).toFixed(6);
  return ethers.parseEther(ethValue);
};

// List product on-chain
export const listProductOnChain = async (
  farmerEmail: string,
  name: string,
  priceInDbUnits: number
): Promise<{ txHash: string; blockchainId: number | null }> => {
  if (!isBlockchainEnabled || !contract) {
    return { txHash: '', blockchainId: null };
  }

  try {
    const farmerAddress = getUserWalletAddress(farmerEmail);
    const priceInWei = ethToWei(priceInDbUnits);

    console.log(`⛓️ Listing product on-chain: "${name}" for farmer: ${farmerAddress}`);
    const tx = await contract.listProduct(farmerAddress, name, priceInWei);
    console.log(`⛓️ Sent transaction: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`⛓️ Product listed on-chain in block ${receipt.blockNumber}`);

    let blockchainId: number | null = null;
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'ProductListed') {
            blockchainId = Number(parsedLog.args.id);
            console.log(`⛓️ Found ProductListed event, ID: ${blockchainId}`);
            break;
          }
        } catch (e) {
          // ignore parsing issues for unrelated logs
        }
      }
    }

    return { txHash: tx.hash, blockchainId };
  } catch (error) {
    console.error(`❌ Blockchain listing failed:`, error);
    return { txHash: '', blockchainId: null };
  }
};

// Purchase product on-chain (escrow)
export const purchaseProductOnChain = async (
  onChainProductId: number,
  buyerEmail: string,
  priceInDbUnits: number
): Promise<{ txHash: string; blockchainOrderId: number | null }> => {
  if (!isBlockchainEnabled || !contract) {
    return { txHash: '', blockchainOrderId: null };
  }

  try {
    const buyerAddress = getUserWalletAddress(buyerEmail);
    const priceInWei = ethToWei(priceInDbUnits);

    console.log(`⛓️ Purchasing product on-chain. Product ID: ${onChainProductId}, Buyer: ${buyerAddress}`);
    const tx = await contract.purchaseProduct(onChainProductId, buyerAddress, { value: priceInWei });
    console.log(`⛓️ Sent transaction: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`⛓️ Escrow payment verified in block ${receipt.blockNumber}`);

    let blockchainOrderId: number | null = null;
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'ProductPurchased') {
            blockchainOrderId = Number(parsedLog.args.orderId);
            console.log(`⛓️ Found ProductPurchased event, Order ID: ${blockchainOrderId}`);
            break;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    return { txHash: tx.hash, blockchainOrderId };
  } catch (error) {
    console.error(`❌ Blockchain purchase failed:`, error);
    return { txHash: '', blockchainOrderId: null };
  }
};

// Confirm delivery on-chain
export const confirmDeliveryOnChain = async (onChainOrderId: number): Promise<string> => {
  if (!isBlockchainEnabled || !contract) {
    return '';
  }

  try {
    console.log(`⛓️ Confirming delivery on-chain. Order ID: ${onChainOrderId}`);
    const tx = await contract.confirmDelivery(onChainOrderId);
    console.log(`⛓️ Sent transaction: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`⛓️ Delivery confirmed on-chain in block ${receipt.blockNumber}`);
    return tx.hash;
  } catch (error) {
    console.error(`❌ Blockchain delivery confirmation failed:`, error);
    return '';
  }
};

// Cancel order on-chain (refund)
export const cancelOrderOnChain = async (onChainOrderId: number): Promise<string> => {
  if (!isBlockchainEnabled || !contract) {
    return '';
  }

  try {
    console.log(`⛓️ Cancelling order on-chain. Order ID: ${onChainOrderId}`);
    const tx = await contract.cancelOrder(onChainOrderId);
    console.log(`⛓️ Sent transaction: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`⛓️ Order cancelled on-chain in block ${receipt.blockNumber}`);
    return tx.hash;
  } catch (error) {
    console.error(`❌ Blockchain cancellation failed:`, error);
    return '';
  }
};

// Get product history on-chain
export const getProductDetailsOnChain = async (onChainProductId: number) => {
  if (!isBlockchainEnabled || !contract) {
    return null;
  }

  try {
    return await contract.getProductDetails(onChainProductId);
  } catch (error) {
    console.error(`❌ Failed to retrieve product details:`, error);
    return null;
  }
};

export const getOrderDetailsOnChain = async (onChainOrderId: number) => {
  if (!isBlockchainEnabled || !contract) {
    return null;
  }

  try {
    return await contract.getOrderDetails(onChainOrderId);
  } catch (error) {
    console.error(`❌ Failed to retrieve order details:`, error);
    return null;
  }
};

export const getProductHistoryOnChain = async (onChainProductId: number): Promise<string[]> => {
  if (!isBlockchainEnabled || !contract) {
    return [];
  }

  try {
    const history = await contract.getProductHistory(onChainProductId);
    return history;
  } catch (error) {
    console.error(`❌ Failed to retrieve product history:`, error);
    return [];
  }
};
