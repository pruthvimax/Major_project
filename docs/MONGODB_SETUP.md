# MongoDB Setup Guide

## Option A — MongoDB Atlas (recommended)

1. Create a free cluster at [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user and password
3. Allow network access (IP whitelist or `0.0.0.0/0` for development)
4. Copy the connection string

In `backend/.env`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/farm_marketplace?retryWrites=true&w=majority
```

## Option B — Local MongoDB

1. Install MongoDB Community Server
2. Start the service (`mongod`)
3. Use:

```env
MONGODB_URI=mongodb://localhost:27017/farm_marketplace
```

## Verify

```bash
cd backend
npm run dev
```

Look for a successful DB connection log. Then hit:

```
GET http://localhost:5000/api/health
```

## Collections used

| Collection | Purpose |
|------------|---------|
| `users` | Auth, roles, suspend flag |
| `products` | Listings, blockchain IDs, approve/block |
| `orders` | Cart checkout, status, escrow fields |
| `carts` | Buyer shopping carts |
| `transactions` | On-chain tx history |
| `reviews` | Product ratings |

Indexes are defined on models for search, buyer/farmer lookups, and order status.
