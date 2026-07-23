# Blockchain-Based Farm Marketplace

A decentralized agricultural marketplace connecting farmers directly with buyers, built with Expo (React Native), MongoDB, and Ethereum blockchain technology.

## 🌟 Features

### For Farmers
- **Product Management**: Add, edit, and manage agricultural products with images
- **Blockchain Registration**: Automatic product registration on Ethereum blockchain
- **Order Management**: Accept, reject, pack, and ship orders
- **Revenue Tracking**: View sales analytics and earnings
- **Real-time Notifications**: Push notifications for new orders

### For Buyers
- **Product Browsing**: Search and filter products by category, price, organic status
- **Shopping Cart**: Add items, update quantities, calculate totals
- **Secure Checkout**: Blockchain-based escrow payments
- **Order Tracking**: Track order status from pending to delivery
- **Order History**: View past orders and reorder

### For Admins
- **User Management**: View, suspend, approve, and delete users
- **Product Moderation**: Approve, block, or remove products
- **Order Oversight**: View all orders, resolve disputes
- **Analytics Dashboard**: Revenue charts, top sellers, activity logs
- **Blockchain Monitoring**: View all blockchain transactions

### Blockchain Integration
- **Smart Contracts**: Product registration, escrow payments, transaction history
- **Ownership Verification**: Trace product origin and ownership
- **Escrow System**: Secure payment holding until delivery confirmation
- **Transaction Recording**: Immutable record of all marketplace activities

## 🏗️ Architecture

### Frontend (Expo/React Native)
- **Framework**: Expo SDK 54 with Expo Router
- **Language**: TypeScript
- **State Management**: React Context (Auth, Cart, Theme)
- **Styling**: Custom theme system with light/dark mode
- **UI Components**: Reusable components with Skeleton loaders and Empty states

### Backend (Node.js/Express)
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **Blockchain**: Ethers.js for Ethereum integration
- **API**: RESTful endpoints with proper validation

### Blockchain (Ethereum/Hardhat)
- **Framework**: Hardhat for smart contract development
- **Language**: Solidity
- **Network**: Local development network (configurable for testnet/mainnet)
- **Contracts**: ProductRegistry, Escrow, TransactionHistory

## 📁 Project Structure

```
farm-marketplace/
├── app/                      # Expo Router pages
│   ├── (admin)/             # Admin dashboard screens
│   ├── (auth)/              # Authentication screens
│   ├── (buyer)/             # Buyer screens
│   ├── (farmer)/            # Farmer screens
│   └── _layout.tsx          # Root layout
├── components/              # Reusable UI components
│   ├── EmptyState.tsx      # Empty state display
│   ├── SkeletonLoader.tsx  # Loading skeletons
│   └── ThemeToggle.tsx     # Dark/light mode toggle
├── constants/               # Design tokens
│   ├── Colors.ts           # Color palette
│   ├── Layout.ts           # Spacing & dimensions
│   ├── ThemeColors.ts      # Theme definitions
│   └── Typography.ts       # Font styles
├── context/                 # React Context providers
│   ├── AuthContext.tsx     # Authentication state
│   ├── CartContext.tsx     # Shopping cart state
│   └── ThemeContext.tsx    # Theme state
├── services/                # API & external services
│   ├── api.ts              # Axios configuration
│   ├── cloudinary.ts       # Image upload
│   └── notifications.ts    # Push notifications
└── types/                   # TypeScript type definitions

backend/
├── src/
│   ├── config/             # Database & environment config
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Auth & error handling
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API route definitions
│   ├── services/          # Blockchain & business logic
│   └── utils/             # Helper functions
└── dist/                  # Compiled JavaScript

blockchain/
├── contracts/             # Solidity smart contracts
├── scripts/               # Deployment scripts
├── test/                  # Contract tests
└── artifacts/             # Compiled contract ABIs

docs/
├── API.md                 # API documentation
├── BLOCKCHAIN_SETUP.md    # Blockchain setup guide
└── MONGODB_SETUP.md       # MongoDB setup guide
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Major
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../farm-marketplace
   npm install
   ```

4. **Install Blockchain Dependencies**
   ```bash
   cd ../blockchain
   npm install
   ```

### Environment Setup

1. **Backend Environment** (`backend/.env`)
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/farm_marketplace
   JWT_SECRET=your_jwt_secret_key
   BLOCKCHAIN_RPC_URL=http://localhost:8545
   PRIVATE_KEY=your_wallet_private_key
   CONTRACT_ADDRESS=your_deployed_contract_address
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

2. **Frontend Environment** (`farm-marketplace/.env`)
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:5000/api
   ```

### Database Setup

See [MONGODB_SETUP.md](../docs/MONGODB_SETUP.md) for detailed instructions.

### Blockchain Setup

See [BLOCKCHAIN_SETUP.md](../docs/BLOCKCHAIN_SETUP.md) for detailed instructions.

### Running the Application

1. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   ```

2. **Start Blockchain Network**
   ```bash
   cd blockchain
   npx hardhat node
   ```

3. **Deploy Smart Contracts** (in a new terminal)
   ```bash
   cd blockchain
   npx hardhat run scripts/deploy.js --network localhost
   ```

4. **Start Backend Server** (in a new terminal)
   ```bash
   cd backend
   npm run dev
   ```

5. **Start Frontend** (in a new terminal)
   ```bash
   cd farm-marketplace
   npx expo start
   ```

6. **Run on Device/Emulator**
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Press `w` for web browser
   - Scan QR code with Expo Go app for physical device

## 📚 API Documentation

See [API.md](../docs/API.md) for complete API endpoint documentation.

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication:

1. **Registration**: Users register with email, password, and role (farmer/buyer)
2. **Login**: Credentials are verified, and a JWT token is issued
3. **Token Storage**: Token is stored in AsyncStorage (mobile) or localStorage (web)
4. **Protected Routes**: API endpoints validate JWT token in Authorization header
5. **Role-Based Access**: Different roles have access to different endpoints

## 🔗 Blockchain Integration

### Smart Contracts

1. **ProductRegistry**: Registers products on blockchain with unique IDs
2. **Escrow**: Manages payment escrow for secure transactions
3. **TransactionHistory**: Records all marketplace transactions

### Key Features

- **Automatic Registration**: Products are automatically registered when farmers add them
- **Escrow Payments**: Payments are held in escrow until delivery confirmation
- **Ownership Tracking**: Complete history of product ownership transfers
- **Transaction Verification**: All transactions are verifiable on-chain

## 🎨 UI/UX Features

- **Modern Agriculture Theme**: Green, white, and dark gray color palette
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Dark Mode**: Toggle between light and dark themes
- **Skeleton Loaders**: Smooth loading states for better UX
- **Empty States**: Helpful messages when no data is available
- **Premium Cards**: Rounded corners with subtle shadows
- **Smooth Animations**: Fluid transitions and interactions

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Blockchain Tests
```bash
cd blockchain
npx hardhat test
```

## 📦 Deployment

### Backend Deployment
1. Build the TypeScript code: `npm run build`
2. Deploy to hosting platform (Heroku, AWS, etc.)
3. Set environment variables
4. Start the server: `npm start`

### Frontend Deployment
1. Build for web: `npx expo export:web`
2. Deploy to hosting platform (Vercel, Netlify, etc.)
3. For mobile: Use EAS Build: `eas build`

### Blockchain Deployment
1. Configure Hardhat for target network (testnet/mainnet)
2. Deploy contracts: `npx hardhat run scripts/deploy.js --network <network>`
3. Update backend with deployed contract addresses

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in the `docs/` folder
- Review API documentation at `docs/API.md`

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev)
- Blockchain powered by [Ethereum](https://ethereum.org)
- Database by [MongoDB](https://mongodb.com)
- Icons by [Ionicons](https://ionic.io/ionicons)
