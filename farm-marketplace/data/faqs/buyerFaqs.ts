import type { FAQEntry } from './types';

/** Buyer-only knowledge: browsing, ordering, tracking, escrow, delivery, refunds. */
export const buyerFaqs: FAQEntry[] = [
  {
    id: 'buyer-find-products',
    role: 'buyer',
    category: 'products',
    question: 'How do I find products?',
    keywords: ['find product', 'find products', 'search', 'browse', 'look for', 'where to buy', 'buy vegetables', 'buy fruits', 'shop', 'filter'],
    answer:
      'Dashboard → "Browse Products". Use the search bar to look for an item by name, and the category chips to narrow results. Product cards show the price per unit, the farmer, stock and rating. Tap a card to see photos and details.',
    route: 'Dashboard → Browse Products',
    followUps: ['What do the categories mean?', 'How do I place an order?'],
  },
  {
    id: 'buyer-categories',
    role: 'buyer',
    category: 'products',
    question: 'What do the categories mean?',
    keywords: ['category', 'categories', 'types of products', 'kinds', 'organic filter', 'what is organic'],
    answer:
      'Products are grouped into four categories:\n• Vegetables — fresh seasonal vegetables\n• Fruits — orchard and seasonal fruits\n• Grains — rice, wheat, millets, pulses\n• Dairy — milk, curd, ghee and similar\nProducts marked "Organic" are grown without chemical fertilisers or pesticides. A "Verified" badge means the listing is registered on the blockchain.',
  },
  {
    id: 'buyer-place-order',
    role: 'buyer',
    category: 'orders',
    question: 'How do I place an order?',
    keywords: ['place order', 'place an order', 'order', 'checkout', 'add to cart', 'cart', 'buy', 'purchase', 'how to order'],
    answer:
      'To order:\n1. Browse Products → choose quantity → "Add to Cart".\n2. Open "My Cart", review items and tap Checkout.\n3. Enter your delivery address.\n4. Choose a payment method (Blockchain Escrow is recommended).\n5. Confirm — you get an order number like ORD-XXXX and the farmer is notified.\nOne order is created per farmer if your cart has items from several farmers.',
    route: 'Dashboard → Browse Products / My Cart',
    followUps: ['How does escrow protect me?', 'How do I track my order?'],
  },
  {
    id: 'buyer-payment-options',
    role: 'buyer',
    category: 'payments',
    question: 'Which payment method should I choose?',
    keywords: ['which payment', 'best payment', 'choose payment', 'which is better', 'better', 'best', 'compare', 'recommended', 'safest', 'cash or blockchain', 'cash', 'pay online', 'upi', 'card', 'cash on delivery', 'cod'],
    answer:
      'At checkout you can pick:\n• Blockchain Escrow — your money is locked in a smart contract and only released after delivery. Safest option.\n• Razorpay (UPI / card / net banking) — paid instantly online.\n• Cash on Delivery — pay the farmer when produce arrives.\n• Bank Transfer — transfer directly to the farmer.\nOnly Blockchain Escrow gives you an on-chain transaction record and automatic refunds.',
    followUps: ['How does escrow protect me?'],
  },
  {
    id: 'buyer-escrow-protection',
    role: 'buyer',
    category: 'escrow',
    question: 'How does escrow protect me?',
    keywords: ['protect me', 'escrow protect', 'is it safe', 'safe', 'safety', 'trust', 'scam', 'fraud', 'guarantee', 'money safe'],
    answer:
      'With Blockchain Escrow your payment never goes straight to the farmer:\n• At checkout the amount is locked in the FarmMarketplace smart contract ("Escrow Created", status Locked).\n• The farmer only receives it when the order is marked Delivered.\n• If the order is cancelled before delivery the contract refunds you automatically.\n• Every step has a transaction hash you can check under Blockchain Transactions.\nSo the farmer cannot be paid without delivering, and you cannot lose money on a cancelled order.',
    followUps: ['How can I request a refund?', 'How do I see my blockchain transactions?'],
  },
  {
    id: 'buyer-track-order',
    role: 'buyer',
    category: 'orders',
    question: 'How do I track my order?',
    keywords: ['track', 'track order', 'track my order', 'where is my order', 'where order', 'where my order', 'find my order', 'order location', 'order status', 'timeline', 'shipped', 'packed', 'delivery status', 'eta', 'expected delivery'],
    answer:
      'Dashboard → "My Orders" → tap "Track" on an order. The timeline shows every status change and any updates the farmer adds (location, expected delivery).\nStatus flow: Pending → Accepted → Packed → Shipped → Delivered.\nYou will also get a push notification when the status changes (in a development build).',
    route: 'Dashboard → My Orders → Track',
    followUps: ['What is the delivery process?'],
  },
  {
    id: 'buyer-delivery-process',
    role: 'buyer',
    category: 'delivery',
    question: 'What is the delivery process?',
    keywords: ['delivery', 'delivery process', 'deliver', 'how long', 'delivery time', 'shipping', 'when will i get', 'arrive', 'address'],
    answer:
      'After you place an order the farmer accepts it, packs the produce and ships it to the address you entered at checkout. You can follow each step on the Track screen. When it arrives and the order is marked Delivered, escrow payment is released to the farmer and you can rate the products.',
    followUps: ['How do I track my order?'],
  },
  {
    id: 'buyer-refund',
    role: 'buyer',
    category: 'refunds',
    question: 'How can I request a refund?',
    keywords: ['refund', 'request refund', 'money back', 'cancel order', 'cancel', 'cancellation', 'return', 'wrong item', 'damaged', 'dispute', 'complain'],
    answer:
      'Refunds work like this:\n• Cancel before shipping — open My Orders and tap Cancel while the order is Pending or Accepted. If you paid with Blockchain Escrow the smart contract refunds you instantly ("Refund Issued").\n• Problem after delivery — contact the marketplace admin with your order number; the admin can review a dispute and release or refund the escrow.\nCash and bank-transfer orders are settled directly with the farmer.',
    followUps: ['How does escrow protect me?'],
  },
  {
    id: 'buyer-recommendations',
    role: 'buyer',
    category: 'products',
    question: 'What should I buy this season?',
    keywords: ['recommend', 'recommendation', 'suggest', 'what to buy', 'best products', 'seasonal', 'in season', 'fresh today', 'popular'],
    answer:
      'Seasonal produce is fresher and cheaper 🌽\n• Look for high-rated products (4★ and above) — ratings come from real delivered orders.\n• Prefer "Organic" and "Verified" badges for chemical-free, blockchain-registered listings.\n• Buy from farmers near your city to reduce transit time.\nAsk me "what products are available" and I will check the live marketplace for you.',
    followUps: ['What products are available now?'],
  },
  {
    id: 'buyer-live-products',
    role: 'buyer',
    category: 'products',
    question: 'What products are available now?',
    keywords: ['available', 'available now', 'what products', 'which products', 'in stock', 'vegetables', 'fruits', 'grains', 'dairy', 'organic products', 'price', 'prices', 'cost', 'rate'],
    source: 'server',
    answer: 'Open Dashboard → "Browse Products" to see everything in stock right now with live prices.',
  },
  {
    id: 'buyer-live-orders',
    role: 'buyer',
    category: 'orders',
    question: 'How many orders have I placed?',
    keywords: ['how many orders', 'my orders count', 'order count', 'orders placed', 'order history'],
    source: 'server',
    answer: 'Open Dashboard → "My Orders" for your complete order history.',
  },
  {
    id: 'buyer-reviews',
    role: 'buyer',
    category: 'orders',
    question: 'How do I rate a product?',
    keywords: ['rate', 'rating', 'review', 'write a review', 'feedback', 'stars'],
    answer: 'Once an order is Delivered, open My Orders and tap "Write a Review" under the product. Choose 1–5 stars and add a comment — it helps other buyers and rewards good farmers.',
  },
  {
    id: 'buyer-cart-help',
    role: 'buyer',
    category: 'orders',
    question: 'How does the cart work?',
    keywords: ['my cart', 'cart empty', 'remove from cart', 'change quantity', 'cart total'],
    answer: 'My Cart keeps items until you check out. Use the + / − stepper to change quantity, swipe or tap the bin icon to remove an item, and the total updates instantly. Items from different farmers become separate orders at checkout.',
  },
];
