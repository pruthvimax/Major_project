import type { FAQEntry } from './types';

/** Farmer-only knowledge: listing, inventory, orders, payouts and selling tips. */
export const farmerFaqs: FAQEntry[] = [
  {
    id: 'farmer-add-product',
    role: 'farmer',
    category: 'products',
    question: 'How do I add a product?',
    keywords: ['add product', 'add a product', 'list product', 'list produce', 'new product', 'create product', 'upload product', 'sell product', 'post product', 'listing', 'how to list'],
    answer:
      'To list produce:\n1. Dashboard → "Add New Product".\n2. Enter name, description, category (vegetables, fruits, grains, dairy), price, quantity and unit (kg, dozen…).\n3. Add photos from your gallery or camera and your location.\n4. Tick "Organic" if it is chemical-free.\n5. Tap Save — the product is registered on the blockchain and gets a transaction hash.\nIt appears to buyers immediately under "Browse Products".',
    route: 'Dashboard → Add New Product',
    followUps: ['How do I improve my product visibility?', 'How does blockchain verification work?'],
  },
  {
    id: 'farmer-inventory',
    role: 'farmer',
    category: 'inventory',
    question: 'How do I manage inventory?',
    keywords: ['inventory', 'stock', 'quantity', 'out of stock', 'restock', 'update stock', 'manage products', 'my products', 'remove product', 'delete product', 'edit product'],
    answer:
      'Inventory is managed from Dashboard → "View Products":\n• Each card shows the current stock (e.g. "Stock: 40 kg"). Stock reduces automatically when a buyer orders.\n• A product with 0 stock is shown as Out of Stock and buyers cannot order it.\n• Use Delete to remove a listing you no longer sell.\n• To restock or change price, add the product again with the new quantity — the new listing gets its own blockchain record.',
    route: 'Dashboard → View Products',
  },
  {
    id: 'farmer-track-orders',
    role: 'farmer',
    category: 'orders',
    question: 'How do I manage my orders?',
    keywords: ['manage orders', 'my orders', 'track order', 'order status', 'accept order', 'new order', 'pending order', 'packed', 'shipped', 'update status', 'order flow'],
    answer:
      'Dashboard → "Manage Orders" lists every order for your products.\nOrder flow: Pending → Accepted → Packed → Shipped → Delivered.\n• Accept a Pending order to confirm it (or reject it).\n• Move it forward with the status button as you pack and ship.\n• You can add tracking updates (location, expected delivery) for the buyer.\n• Mark Delivered once the buyer has the produce — this releases the escrow payment to you.',
    route: 'Dashboard → Manage Orders',
    followUps: ['How do I receive payment?', 'What happens after delivery confirmation?'],
  },
  {
    id: 'farmer-receive-payment',
    role: 'farmer',
    category: 'payments',
    question: 'How do I receive payment?',
    keywords: ['receive payment', 'get paid', 'payout', 'my money', 'when paid', 'payment received', 'earnings', 'income', 'settlement', 'money'],
    answer:
      'How you get paid depends on the buyer\'s payment method:\n• Blockchain Escrow — the buyer\'s money is locked in the smart contract when they order. The moment the order is marked Delivered it is released to your wallet address ("Payment Released" in Blockchain Transactions).\n• Razorpay — paid online when the order is placed; the order shows Paid.\n• Cash on Delivery — collect cash when you hand over the produce.\n• Bank Transfer — the buyer transfers to you directly.\nYour dashboard shows total revenue from delivered orders.',
    followUps: ['How does blockchain escrow work?', 'What happens after delivery confirmation?'],
  },
  {
    id: 'farmer-cancel',
    role: 'farmer',
    category: 'refunds',
    question: 'What if an order is cancelled?',
    keywords: ['cancel', 'cancelled', 'cancellation', 'reject order', 'refund', 'buyer cancelled'],
    answer:
      'A buyer can cancel while an order is Pending or Accepted, and you can reject a Pending order. If the buyer paid with Blockchain Escrow, the smart contract automatically refunds them ("Refund Issued") and the stock is returned to your product. Nothing is deducted from you.',
  },
  {
    id: 'farmer-visibility',
    role: 'farmer',
    category: 'selling',
    question: 'How do I improve my product visibility?',
    keywords: ['visibility', 'product visibility', 'improve visibility', 'improve my product', 'more sales', 'sell more', 'more buyers', 'promote', 'popular', 'ranking', 'featured', 'attract buyers', 'improve'],
    answer:
      'Tips to get more orders 📈\n• Use clear, bright photos of the actual produce.\n• Write the variety, freshness and harvest date in the description.\n• Price competitively — buyers compare per-kg prices in Browse.\n• Mark genuinely organic produce as Organic; buyers filter for it.\n• Keep stock updated so you never show Out of Stock.\n• Accept and ship quickly — good ratings raise your average rating shown on every product card.',
    followUps: ['Best practices for selling produce', 'Organic farming tips'],
  },
  {
    id: 'farmer-selling-best-practices',
    role: 'farmer',
    category: 'selling',
    question: 'Best practices for selling produce',
    keywords: ['best practice', 'best practices', 'selling', 'selling tips', 'tips', 'pricing', 'price', 'packaging', 'grading', 'quality', 'fresh'],
    answer:
      'Selling best practices 🧺\n• Grade and sort produce by size and quality; list premium and standard grades separately.\n• Pack in breathable crates or bags; avoid crushing soft items like tomatoes.\n• Set the price per clear unit (kg, dozen, bunch) and keep it steady.\n• Respond to orders within a few hours — buyers watch the status.\n• Ask satisfied buyers to leave a review; ratings appear on your product cards.\n• Sell what is in season — it costs less to grow and tastes better.',
    followUps: ['How do I improve my product visibility?'],
  },
  {
    id: 'farmer-reviews',
    role: 'farmer',
    category: 'selling',
    question: 'How do reviews and ratings work?',
    keywords: ['review', 'reviews', 'rating', 'ratings', 'stars', 'feedback'],
    answer:
      'After an order is Delivered the buyer can rate each product 1–5 stars and leave a comment. Your dashboard\'s Review Analytics shows your average rating and recent reviews. High ratings build trust and bring repeat buyers.',
  },
  {
    id: 'farmer-dashboard-stats',
    role: 'farmer',
    category: 'marketplace',
    question: 'What do the dashboard numbers mean?',
    keywords: ['dashboard', 'stats', 'statistics', 'revenue', 'total products', 'total orders', 'analytics', 'overview'],
    answer:
      'Your dashboard summarises your marketplace activity: number of listed products, total orders received, pending orders waiting for action, and revenue from delivered orders. Pull down to refresh the numbers.',
  },
  {
    id: 'farmer-live-orders',
    role: 'farmer',
    category: 'orders',
    question: 'How many orders do I have?',
    keywords: ['how many orders', 'order count', 'number of orders', 'orders today', 'any new orders'],
    source: 'server',
    answer: 'Open Dashboard → "Manage Orders" to see your live order list and counts.',
  },
  {
    id: 'farmer-live-products',
    role: 'farmer',
    category: 'products',
    question: 'What products are currently listed?',
    keywords: ['which products', 'what products', 'available products', 'currently listed', 'vegetables', 'fruits', 'grains', 'dairy', 'prices', 'market price', 'rate'],
    source: 'server',
    answer: 'Open Dashboard → "View Products" for your current listings and prices.',
  },
];
