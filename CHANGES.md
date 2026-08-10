# SJEC Farm-Marketplace Project Changes

This document outlines the major updates, features, and fixes implemented in this repository to establish decentralized blockchain payments, complete multi-role dashboards, add image picking capabilities, and resolve platform compatibility issues.

---

## ⛓️ 1. Blockchain Escrow & Smart Contracts
* **Smart Contract Development**: Created the Solidity contract `FarmMarketplace.sol` to handle trustless secure transactions:
  * **On-Chain Listing**: Captures metadata, price, and merchant signatures.
  * **Trustless Escrow**: Holds buyer payments inside the contract balance.
  * **Confirm Delivery**: Releases funds to the farmer and logs product ownership history.
  * **Order Cancellations**: Instantly refunds the buyer on-chain.
* **Testing Suite**: Created Ethers/Mocha unit tests verifying listings, payments, escrow locks, delivery completions, and refund states (6/6 tests passing).
* **State Inspector Script**: Developed `queryState.ts` enabling read-only ledgers inspection directly from the Hardhat network console.

---

## ⚙️ 2. Backend Smart-Contract Integration
* **Blockchain Relayer Service**: Developed `blockchainService.ts` using Ethers.js to sign transactions, calculate gas, handle network provider fallbacks, and interact with the deployed Solidity contract.
* **Product Controller Updates**: Updated listing routes to register products on-chain immediately upon database creation.
* **Order Controller Updates**: Added handlers to process payments through smart contract escrow logic, dispatch delivery confirmations, and initiate on-chain refunds.

---

## 📱 3. React Native / Expo Frontend Dashboards

### 🧑‍🌾 Farmer Dashboard & Catalog Management
* **Counts & Stats**: Configured the dashboard to dynamically fetch active listed produce counts and total order queues.
* **On-Chain Product Registration**: Designed a form screen to add details (name, price, stock, description, organic) and initiate the smart contract listing transaction.
* **Product Catalog**: Lists farmer items showing current stock levels, on-chain verified status (with blockchain ID and Tx hash), and delete listing capability.

### 🛒 Buyer Marketplace & Escrow Checkout
* **Search & Filters**: Implemented search inputs and category filters (Vegetables, Fruits, Grains, Dairy, Organic).
* **Quantity & Escrow Select**: Implemented quantity selectors and configured payment mode options (Cash, Bank, or **⛓️ Blockchain Escrow**).
* **On-Chain Orders**: Lists orders showing payment methods, status indicators, on-chain escrow IDs, transaction hash logs, and refund triggers.

### 👑 System Administrator Dashboard
* **Dynamic Audits**: Loads dashboard counts for platform users, active listings, and order queues from the MongoDB database.
* **User Management**: Moderation screen to delete accounts.
* **Marketplace Overview**: Monitoring screen to audit listed products and delete entries.
* **Order Moderation**: Audits all payment routes and permits administrators to force cancellations.

---

## 📸 4. Device Camera/Gallery Uploader & Cloudinary Storage
* **Permissions & Selection**: Installed `expo-image-picker` to enable native camera capture and media library selections.
* **Direct-to-Cloudinary Upload**: Created an upload service leveraging Cloudinary Unsigned Uploads to transform local device file paths into secure HTTPS URLs directly from the client.
* **Upload Progress Tracker**: Implemented user indicators changing from `"Uploading Image..."` to `"Securing On-Chain..."` during submissions.

---

## 🕸️ 5. Web Browser Compatibility & Fixes
* **Alert Interventions**: Replaced standard React Native android `Alert.alert` (which crashes/freezes on Web) with conditional checks using native browser `window.confirm` and `window.alert` dialogs for login validations, registration, checkout success, and logout warnings.
* **TypeScript Compiler Fixes**:
  * Added `as const` to [constants/Typography.ts](file:///d:/Major/Major_project/farm-marketplace/constants/Typography.ts) to define exact literal types for `fontWeight` properties.
  * Cast `StyleSheet.create` output as `any` in all screens to prevent generic `TextStyle` key properties from throwing compilation warnings when passed to layout blocks.
