# Blockchain Setup Guide

## Overview

The marketplace uses a Hardhat + Solidity escrow contract (`FarmMarketplace.sol`) for:

- Product registration (on-chain listing ID)
- Escrow payments when buyers choose **Blockchain Escrow**
- Delivery confirmation → release funds to farmer
- Cancellation → refund buyer
- Ownership / product history

Backend connects via a **relayer wallet** (`ETHEREUM_PRIVATE_KEY`) and stores:

- `blockchainId` / `blockchainOrderId`
- `blockchainTxHash`
- `escrowStatus` (`none` | `locked` | `released` | `refunded` | `failed`)
- `verificationStatus`
- Wallet addresses derived from user email
- Rows in the `Transaction` MongoDB collection

---

## 1. Install

```bash
cd blockchain
npm install
```

## 2. Compile & test

```bash
npx hardhat compile
npx hardhat test
```

## 3. Run local node

```bash
npx hardhat node
```

## 4. Deploy

In a second terminal:

```bash
npm run deploy:local
```

This writes `backend/src/config/contractDetails.json` (address + ABI).

## 5. Backend env

In `backend/.env`:

```env
ETHEREUM_NODE_URL=http://127.0.0.1:8545
ETHEREUM_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

(The private key above is Hardhat account #0 — **local only**.)

Restart the API. You should see:

```
🔗 Blockchain Service Initialized
```

If the node is down, the API runs in **database-only** mode (orders still work without on-chain escrow).

## 6. Inspect state

```bash
npm run query
```

## Contract flow

1. Farmer adds product → `listProduct` → `ProductListed` event → `blockchainId`
2. Buyer places blockchain order → `purchaseProduct` (ETH escrow) → `blockchainOrderId`, `escrowStatus=locked`
3. Farmer marks delivered → `confirmDelivery` → funds to farmer, ownership history updated
4. Cancel before delivery → `cancelOrder` → refund buyer, relist product

## Services (backend)

| File | Role |
|------|------|
| `services/blockchainService.ts` | Provider, wallet, contract calls |
| `services/escrowService.ts` | Create / release / refund escrow |
| `services/transactionService.ts` | Persist tx history in MongoDB |
