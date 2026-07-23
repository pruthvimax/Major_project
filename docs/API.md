# API Documentation

Base URL: `http://localhost:5000/api`  
Auth: `Authorization: Bearer <JWT>`

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`  
**Access**: Public

Register a new user (farmer, buyer, or admin).

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "mobile": "9876543210",
  "role": "farmer",
  "address": {
    "street": "123 Farm Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "country": "India"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "farmer"
  }
}
```

---

### Login
**POST** `/auth/login`  
**Access**: Public

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "farmer"
  }
}
```

---

### Get Current User
**GET** `/auth/me`  
**Access**: Private (All authenticated users)

Get current authenticated user details.

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "farmer",
    "mobile": "9876543210",
    "address": { ... }
  }
}
```

---

## User Management Endpoints

### Get All Users
**GET** `/users`  
**Access**: Admin

List all users in the system.

**Response:**
```json
{
  "success": true,
  "count": 10,
  "users": [
    {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "farmer",
      "isSuspended": false
    }
  ]
}
```

---

### Get User by ID
**GET** `/users/:id`  
**Access**: Private

Get specific user profile.

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "farmer"
  }
}
```

---

### Update Profile
**PUT** `/users/profile`  
**Access**: Private

Update current user's profile.

**Request Body:**
```json
{
  "name": "John Updated",
  "mobile": "9876543211",
  "address": {
    "street": "456 New Road",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}
```

---

### Suspend/Unsuspend User
**PUT** `/users/:id/suspend`  
**Access**: Admin

Suspend or unsuspend a user account.

**Request Body:**
```json
{
  "suspended": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User suspended",
  "user": { ... }
}
```

---

### Delete User
**DELETE** `/users/:id`  
**Access**: Admin

Permanently delete a user account.

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### Get Farmers List
**GET** `/users/farmers`  
**Access**: Private

List all farmers.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "farmers": [ ... ]
}
```

---

### Get Buyers List
**GET** `/users/buyers`  
**Access**: Admin

List all buyers.

**Response:**
```json
{
  "success": true,
  "count": 15,
  "buyers": [ ... ]
}
```

---

## Product Endpoints

### Get Products
**GET** `/products`  
**Access**: Public

List available products with optional filters.

**Query Parameters:**
- `search`: Search by name or description
- `category`: Filter by category
- `farmer`: Filter by farmer ID
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `organic`: `true` for organic products only
- `all`: `true` to include blocked/unapproved products (Admin only)

**Example:** `GET /products?category=vegetables&organic=true&minPrice=10`

**Response:**
```json
{
  "success": true,
  "count": 20,
  "products": [
    {
      "_id": "product_id",
      "name": "Organic Tomatoes",
      "description": "Fresh organic tomatoes",
      "category": "vegetables",
      "price": 50,
      "quantity": 100,
      "unit": "kg",
      "images": ["image_url"],
      "farmer": {
        "_id": "farmer_id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "isOrganic": true,
      "isApproved": true,
      "isBlocked": false,
      "blockchainId": "chain_id",
      "verificationStatus": "verified"
    }
  ]
}
```

---

### Get Product by ID
**GET** `/products/:id`  
**Access**: Public

Get detailed product information.

**Response:**
```json
{
  "success": true,
  "product": { ... }
}
```

---

### Create Product
**POST** `/products`  
**Access**: Farmer

Create a new product (automatically registered on blockchain).

**Request Body:**
```json
{
  "name": "Organic Potatoes",
  "description": "Fresh organic potatoes from farm",
  "category": "vegetables",
  "price": 30,
  "quantity": 500,
  "unit": "kg",
  "images": ["image_url_1", "image_url_2"],
  "location": "Bangalore",
  "isOrganic": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "product": {
    "_id": "product_id",
    "name": "Organic Potatoes",
    "blockchainTxHash": "0x...",
    "blockchainId": "chain_id",
    "verificationStatus": "verified"
  }
}
```

---

### Update Product
**PUT** `/products/:id`  
**Access**: Farmer (product owner only)

Update product details.

**Request Body:**
```json
{
  "price": 35,
  "quantity": 450,
  "description": "Updated description"
}
```

---

### Delete Product
**DELETE** `/products/:id`  
**Access**: Farmer (owner) or Admin

Delete a product from the marketplace.

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

### Get Farmer's Products
**GET** `/products/farmer/my-products`  
**Access**: Farmer

Get all products owned by the current farmer.

**Response:**
```json
{
  "success": true,
  "count": 10,
  "products": [ ... ]
}
```

---

### Approve Product
**PUT** `/products/:id/approve`  
**Access**: Admin

Approve a product for listing.

**Response:**
```json
{
  "success": true,
  "message": "Product approved",
  "product": { ... }
}
```

---

### Block Product
**PUT** `/products/:id/block`  
**Access**: Admin

Block a product from the marketplace.

**Response:**
```json
{
  "success": true,
  "message": "Product blocked",
  "product": { ... }
}
```

---

## Cart Endpoints

### Get Cart
**GET** `/cart`  
**Access**: Buyer

Get current user's cart with summary.

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "product": { ... },
      "quantity": 2,
      "price": 50
    }
  ],
  "summary": {
    "itemCount": 2,
    "subtotal": 100,
    "total": 100
  }
}
```

---

### Add Item to Cart
**POST** `/cart/items`  
**Access**: Buyer

Add a product to cart.

**Request Body:**
```json
{
  "productId": "product_id",
  "quantity": 2
}
```

---

### Update Cart Item
**PUT** `/cart/items/:productId`  
**Access**: Buyer

Update quantity of a cart item.

**Request Body:**
```json
{
  "quantity": 5
}
```

---

### Remove Cart Item
**DELETE** `/cart/items/:productId`  
**Access**: Buyer

Remove an item from cart.

---

### Clear Cart
**DELETE** `/cart`  
**Access**: Buyer

Clear all items from cart.

---

## Order Endpoints

### Create Order
**POST** `/orders`  
**Access**: Buyer

Place a new order.

**Request Body:**
```json
{
  "items": [
    { "productId": "product_id_1", "quantity": 2 },
    { "productId": "product_id_2", "quantity": 1 }
  ],
  "shippingAddress": {
    "address": "123 Street",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "country": "India"
  },
  "paymentMethod": "blockchain",
  "notes": "Please deliver in the evening",
  "clearCart": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "order": {
    "_id": "order_id",
    "orderNumber": "ORD-12345",
    "status": "pending",
    "totalAmount": 150,
    "items": [ ... ],
    "blockchainTxHash": "0x..."
  }
}
```

---

### Get All Orders
**GET** `/orders`  
**Access**: Admin

Get all orders in the system.

**Response:**
```json
{
  "success": true,
  "count": 50,
  "orders": [ ... ]
}
```

---

### Get Buyer Orders
**GET** `/orders/buyer`  
**Access**: Buyer

Get current buyer's order history.

**Response:**
```json
{
  "success": true,
  "orders": [ ... ]
}
```

---

### Get Farmer Orders
**GET** `/orders/farmer`  
**Access**: Farmer

Get incoming orders for the current farmer.

**Response:**
```json
{
  "success": true,
  "orders": [ ... ]
}
```

---

### Get Order by ID
**GET** `/orders/:id`  
**Access**: Private (Buyer, Farmer, or Admin)

Get detailed order information.

**Response:**
```json
{
  "success": true,
  "order": {
    "_id": "order_id",
    "orderNumber": "ORD-12345",
    "status": "shipped",
    "paymentStatus": "paid",
    "totalAmount": 150,
    "items": [ ... ],
    "buyer": { ... },
    "farmer": { ... },
    "shippingAddress": { ... },
    "blockchainTxHash": "0x..."
  }
}
```

---

### Update Order Status
**PUT** `/orders/:id/status`  
**Access**: Farmer or Admin

Update order status.

**Request Body:**
```json
{
  "status": "shipped"
}
```

**Valid Statuses:**
- `pending` → `accepted` → `packed` → `shipped` → `delivered`
- `cancelled` (any stage before delivery)

---

### Cancel Order
**PUT** `/orders/:id/cancel`  
**Access**: Buyer (before acceptance) or Admin

Cancel an order.

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "order": { ... }
}
```

---

### Update Payment Status
**PUT** `/orders/:id/payment`  
**Access**: Buyer or Admin

Update payment status of an order.

**Request Body:**
```json
{
  "paymentStatus": "paid"
}
```

---

### Flag Dispute
**PUT** `/orders/:id/dispute`  
**Access**: Private

Flag an order for dispute resolution.

**Response:**
```json
{
  "success": true,
  "message": "Dispute flagged",
  "order": { ... }
}
```

---

### Resolve Dispute
**PUT** `/orders/:id/resolve-dispute`  
**Access**: Admin

Resolve a disputed order.

**Request Body:**
```json
{
  "resolution": "Refund issued to buyer"
}
```

---

## Admin Endpoints

### Get Analytics
**GET** `/admin/analytics`  
**Access**: Admin

Get dashboard analytics data.

**Response:**
```json
{
  "success": true,
  "analytics": {
    "cards": {
      "totalFarmers": 25,
      "totalBuyers": 150,
      "totalProducts": 500,
      "totalOrders": 300,
      "revenue": 150000,
      "blockchainTransactions": 800,
      "disputedOrders": 2
    },
    "monthlyRevenue": [
      {
        "_id": { "year": 2024, "month": 1 },
        "revenue": 25000,
        "orders": 50
      }
    ],
    "mostSoldProducts": [
      {
        "name": "Organic Tomatoes",
        "soldQty": 200,
        "revenue": 10000
      }
    ],
    "topFarmers": [
      {
        "name": "John Doe",
        "orderCount": 50,
        "revenue": 25000
      }
    ],
    "topBuyers": [
      {
        "name": "Jane Smith",
        "orderCount": 20,
        "spent": 5000
      }
    ],
    "latestActivities": [
      {
        "type": "order",
        "message": "Order ORD-12345 — shipped",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "disputedOrders": [ ... ]
  }
}
```

---

### Get Blockchain Transactions
**GET** `/admin/transactions`  
**Access**: Admin

Get all blockchain transaction records.

**Response:**
```json
{
  "success": true,
  "count": 100,
  "transactions": [
    {
      "_id": "tx_id",
      "txHash": "0x...",
      "type": "product_listing",
      "from": "wallet_address",
      "to": "marketplace",
      "amount": 50,
      "status": "confirmed",
      "userId": "user_id",
      "productId": "product_id",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Payment Endpoints

### Create Razorpay Order
**POST** `/payments/razorpay/create`  
**Access**: Buyer

Create a Razorpay payment order.

**Request Body:**
```json
{
  "amount": 15000,
  "currency": "INR",
  "orderId": "order_id"
}
```

---

### Verify Razorpay Payment
**POST** `/payments/razorpay/verify`  
**Access**: Buyer

Verify Razorpay payment signature.

**Request Body:**
```json
{
  "razorpay_payment_id": "pay_...",
  "razorpay_order_id": "order_...",
  "razorpay_signature": "signature"
}
```

---

## Review Endpoints

### Create Review
**POST** `/reviews`  
**Access**: Buyer

Create a product review.

**Request Body:**
```json
{
  "productId": "product_id",
  "orderId": "order_id",
  "rating": 5,
  "comment": "Excellent product!"
}
```

---

### Get Product Reviews
**GET** `/reviews/product/:productId`  
**Access**: Public

Get all reviews for a product.

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "_id": "review_id",
      "user": { "name": "Jane Smith" },
      "rating": 5,
      "comment": "Excellent product!",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Health Check

### Server Status
**GET** `/health`  
**Access**: Public

Check if the server is running.

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

API requests are rate-limited to prevent abuse:
- Standard limit: 100 requests per minute per IP
- Authenticated users: 200 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```
