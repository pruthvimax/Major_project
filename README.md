# Blockchain-Based Farm Marketplace

Cross-platform mobile app that connects farmers and buyers directly, with blockchain-backed product registration and escrow payments. Frontend: React Native (Expo). Backend: Node.js / Express / MongoDB.

**Repository:** [https://github.com/vaishaldsouza/Major_project](https://github.com/vaishaldsouza/Major_project)

---

## Project structure

```
Major_project/
├── farm-marketplace/   # Expo React Native app
├── backend/            # Express API + MongoDB
├── blockchain/         # Hardhat + Solidity contracts
├── .gitignore
└── README.md
```

---

## Features

### Authentication
- Multi-role registration and login (Farmer, Buyer, Admin)
- JWT auth and bcrypt password hashing

### Dashboards
- **Farmer:** products, orders, on-chain listing
- **Buyer:** browse, checkout, orders, order tracking
- **Admin:** users, products, orders, system settings

### UI
- **Dark / light mode** with persisted preference (AsyncStorage)
- Theme toggle on home and auth screens; dark mode switch in admin settings

### Payments & media
- Cash, bank transfer, Razorpay, and blockchain escrow options
- Cloudinary image upload for product photos
- Push notification token registration

### Backend API
- Users, products, orders, payments, reviews
- Role-based access control
- Blockchain relayer integration

---

## Tech stack

| Layer | Stack |
|-------|--------|
| Mobile | React Native, Expo ~54, Expo Router, TypeScript |
| API | Node.js, Express, MongoDB, Mongoose, JWT |
| Chain | Ethereum, Solidity, Hardhat, Ethers.js |

---

## Prerequisites

- Node.js 18 or 20
- npm
- MongoDB Atlas (or local MongoDB)
- Expo Go / Android Studio / iOS Simulator
- (Optional) Hardhat local node for blockchain features

---

## Setup

### 1. Clone

```bash
git clone https://github.com/vaishaldsouza/Major_project.git
cd Major_project
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET, and optional Razorpay / Ethereum keys
npm install
npm run dev
```

Server defaults to `http://localhost:5000`.

### 3. Mobile app

```bash
cd farm-marketplace
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your machine IP, e.g. http://192.168.x.x:5000/api
# Also update BASE_URL in app/services/api.ts if you are not using Expo env yet
npm install
npx expo start
```

### 4. Blockchain (optional)

```bash
cd blockchain
npm install
npx hardhat node
# In another terminal: deploy scripts as documented under blockchain/
```

---

## Environment variables

### Backend (`backend/.env`)

Copy from [`backend/.env.example`](backend/.env.example):

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` / `JWT_EXPIRE` | Auth token config |
| `ETHEREUM_NODE_URL` / `ETHEREUM_PRIVATE_KEY` | Blockchain relayer |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Online payments (optional) |

### Frontend (`farm-marketplace/.env`)

Copy from [`farm-marketplace/.env.example`](farm-marketplace/.env.example). Keep real secrets out of git — `.env` files are gitignored.

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (public OK) |
| `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | **Unsigned** upload preset name |

Image uploads use an unsigned preset so the API secret never ships in the mobile app.

---

## Security: leaked Cloudinary credentials

If GitGuardian (or similar) reports exposed Cloudinary keys:

1. **Rotate / disable the leaked key** in [Cloudinary Console → Settings → API Keys](https://console.cloudinary.com/settings/api-keys) ([rotation guide](https://cloudinary.com/documentation/ts_how_to_rotate_api_keys_in_the_console)).
2. Create an **unsigned** upload preset (Settings → Upload → Upload presets).
3. Put only `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` and `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` in `farm-marketplace/.env`.
4. Never commit API secrets or put them in `app.json` / client source.
5. If the leak was on a fork or upstream (`pruthvimax/Major_project`), open a PR or ask the owner to pull the same fix — rotating the key is still required even if history still contains the old secret.

---

## Dark / light mode

- Tap the moon/sun icon in the header (dashboards and login/register)
- Or use **Appearance → Dark Mode** in Admin Settings
- Preference is stored in AsyncStorage and restored on next launch

---

## Scripts

| Location | Command | Description |
|----------|---------|-------------|
| `backend` | `npm run dev` | Start API with nodemon |
| `backend` | `npm run build` | Compile TypeScript |
| `farm-marketplace` | `npx expo start` | Start Expo dev server |
| `blockchain` | `npx hardhat test` | Run contract tests |

---

## License

ISC — academic / final-year project use.
