# 🌾 Blockchain-Based Farm Marketplace

A full-stack blockchain-enabled marketplace that directly connects farmers and buyers, eliminating unnecessary middlemen and enabling secure, transparent agricultural trade.

The platform supports:

- 👨‍🌾 Farmers
- 🛒 Buyers
- 👨‍💼 Administrators
- ⛓️ Blockchain Escrow Transactions
- 📊 Analytics & Monitoring
- ⭐ Reviews & Ratings

---

# 📂 Project Structure

```text
Major_project/
├── backend/                # Express + TypeScript Backend
├── blockchain/             # Solidity Smart Contracts (Hardhat)
├── farm-marketplace/       # Expo React Native Mobile App
├── docs/                   # Project Documentation
└── README.md
```

---

# 🚀 Tech Stack

## Mobile Application

- React Native
- Expo SDK 54
- Expo Router
- TypeScript
- AsyncStorage

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Bcrypt

## Blockchain

- Solidity
- Hardhat
- Ethers.js
- Ethereum Local Network

---

# ✅ Completed Features

---

## 🔐 Authentication Module

### Multi Role Login

- Farmer Login
- Buyer Login
- Admin Login

### Security

- JWT Authentication
- Password Hashing
- Protected Routes
- Role Validation
- Suspended User Handling

---

# 👨‍🌾 Farmer Module

### Product Management

- Add Product
- Edit Product
- Delete Product
- Product Inventory

### Dashboard

- Product Statistics
- Revenue Overview
- Order Summary

### Reviews

- View Product Reviews
- View Customer Feedback
- Farmer Rating Data

---

# 🛒 Buyer Module

### Marketplace

- Browse Products
- Search Products
- Product Details
- Product Categories

### Cart

- Add To Cart
- Update Quantity
- Remove Items
- Cart Summary

### Orders

- Checkout
- Place Orders
- View Order History
- Cancel Orders
- Track Orders

---

# 📦 Order Management

### Features

- Order Placement
- Order Tracking
- Order Cancellation
- Order History

### Order Details Stored

- Order Number
- Buyer
- Farmer
- Product Information
- Quantity
- Total Amount
- Payment Method
- Shipping Address
- Status
- Created Date

### Automatic Order Number Generation

Format:

```text
ORD-<timestamp>-<random>
```

Example:

```text
ORD-MS5L9LXM-UPHH
```

---

# ⭐ Review & Rating System

### Buyers

- Submit Product Reviews
- Rate Products
- Provide Feedback

### Farmers

- View Reviews
- Monitor Product Ratings
- Customer Feedback Tracking

---

# 👨‍💼 Admin Panel

## Dashboard Analytics

Displays:

- Total Farmers
- Total Buyers
- Total Products
- Total Orders
- Pending Orders
- Delivered Orders
- Cancelled Orders
- Revenue
- Blockchain Transactions

---

## User Management

Admin can:

- Search Users
- Filter Users
- View User Details
- Suspend Users
- Activate Users
- Delete Users

---

## Product Moderation

Admin can:

- Approve Products
- Block Products
- Unblock Products
- Reject Products
- Delete Products

---

## Order Management

Admin can:

- View Orders
- Search Orders
- Filter Orders
- View Full Order Details
- Cancel Orders
- Monitor Payments

---

## Dispute Management

Admin can:

- View Disputes
- Resolve Disputes
- Add Resolution Notes
- Monitor Dispute Status

---

## Analytics Module

Displays:

- Revenue Analytics
- Category Analytics
- Product Performance
- User Growth
- Marketplace Statistics

---

# ⛓️ Blockchain Module

## Smart Contract Features

### Product Registration

Products are registered on-chain.

### Escrow Transactions

Buyer funds are securely locked.

### Delivery Confirmation

Funds released after delivery confirmation.

### Refund Support

Automatic refund processing.

### Product Traceability

Track ownership history and transaction records.

---

# ⛓️ Blockchain Transaction History

Displays:

- Transaction ID
- Order Number
- Wallet Address
- Amount
- Status
- Date
- Escrow Information

---

# 🗄 Database

MongoDB Collections

### Users

Stores:

- Farmer Accounts
- Buyer Accounts
- Admin Accounts

### Products

Stores:

- Product Information
- Farmer Information
- Inventory

### Orders

Stores:

- Complete Order Records

### Reviews

Stores:

- Product Reviews
- Ratings
- Feedback

### Transactions

Stores:

- Blockchain Transaction Data

---

# ⚙️ Environment Variables

## Backend

```env
PORT=
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRE=

ETHEREUM_NODE_URL=
BLOCKCHAIN_RPC_URL=

ETHEREUM_PRIVATE_KEY=
PRIVATE_KEY=

CONTRACT_ADDRESS=
```

---

## Frontend

```env
EXPO_PUBLIC_API_URL=
```

---

# 🚀 Backend Setup

```bash
cd backend

npm install

npm run dev
```

---

# 📱 Mobile App Setup

```bash
cd farm-marketplace

npm install

npx expo start
```

---

# ⛓️ Blockchain Setup

Install Dependencies

```bash
cd blockchain

npm install
```

---

## Start Local Blockchain

```bash
cd blockchain

npm run node
```

This runs:

```bash
hardhat node
```

---

## Deploy Smart Contract

Open another terminal:

```bash
cd blockchain

npm run deploy:local
```

This deploys:

```bash
hardhat run scripts/deploy.ts --network localhost
```

---

## Run Smart Contract Tests

```bash
cd blockchain

npm test
```

or

```bash
npx hardhat test
```

---

# 🧪 Verification Completed

Successfully Tested:

✅ Authentication

✅ JWT Security

✅ MongoDB Connection

✅ Product CRUD

✅ Cart Management

✅ Order Placement

✅ Order Tracking

✅ Order Storage

✅ Order Number Generation

✅ Review System

✅ Admin Dashboard

✅ User Management

✅ Product Moderation

✅ Blockchain Smart Contract Tests

✅ Escrow Workflow

✅ Product Traceability

---

# 📈 Current Project Status

## Completed

✅ Authentication Module

✅ MongoDB Integration

✅ Farmer Dashboard

✅ Buyer Dashboard

✅ Admin Dashboard

✅ Product CRUD

✅ Cart Module

✅ Order Management

✅ Review System

✅ Analytics Dashboard

✅ Blockchain Smart Contracts

✅ Escrow Payments

✅ Product Traceability

✅ Transaction History

---

## In Progress

🚧 Farmer Rating Analytics

🚧 AI Agriculture Assistant

🚧 Government Scheme Module

🚧 Revenue & Commission Analytics

---

## Planned

⏳ Multi Language Support

⏳ Crop Disease Detection

⏳ Push Notifications

⏳ Real Time Tracking

⏳ Production Deployment

---

# 📅 Latest Update

Updated On:

**29 July 2026 – 11:37 AM**

### Recent Work

- Fixed Order Creation Validation
- Added Automatic Order Number Generation
- Improved Admin Dashboard
- Added Dispute Management
- Added Blockchain Traceability
- Added Transaction Monitoring
- Enhanced Analytics
- Improved UI & Responsiveness

---

# 🌾 Vision

To create a transparent, secure, and scalable agricultural marketplace that empowers farmers, connects buyers directly, and leverages blockchain technology to ensure trust in every transaction.
