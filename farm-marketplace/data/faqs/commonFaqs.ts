import type { FAQEntry } from './types';

/**
 * Knowledge shared by farmers and buyers: greetings, escrow, blockchain,
 * agriculture tips and general support.
 */
export const commonFaqs: FAQEntry[] = [
  {
    id: 'greeting',
    role: 'both',
    category: 'greeting',
    question: 'Hello',
    keywords: ['hi', 'hello', 'hey', 'namaste', 'namaskara', 'good morning', 'good evening', 'start'],
    answer:
      'Hello! I am your Krishi Assistant 🌱\nI can explain how the marketplace works, how blockchain escrow protects payments, and share farming tips. Pick a question below or type your own.',
  },
  {
    id: 'thanks',
    role: 'both',
    category: 'greeting',
    question: 'Thank you',
    keywords: ['thanks', 'thank you', 'thank', 'great', 'awesome', 'nice', 'ok', 'okay', 'cool', 'super'],
    answer: 'You are welcome! 😊 Ask me anything else about the marketplace, payments or farming whenever you need.',
  },
  {
    id: 'help',
    role: 'both',
    category: 'support',
    question: 'What can you help with?',
    keywords: ['help', 'what can you do', 'options', 'menu', 'features', 'guide', 'how to use', 'assist'],
    answer:
      'I can help you with:\n• Using the marketplace (products, cart, orders)\n• Payments and blockchain escrow\n• Order tracking, delivery and refunds\n• Farming and organic produce tips\nJust type a question, or tap one of the suggestions.',
  },
  {
    id: 'escrow-basics',
    role: 'both',
    category: 'escrow',
    question: 'How does blockchain escrow work?',
    keywords: ['escrow', 'escrow work', 'smart contract', 'locked', 'lock payment', 'hold payment', 'secure payment', 'protect'],
    answer:
      'Blockchain escrow is a smart contract that holds the payment safely until the order is complete:\n1. Buyer pays → the amount is LOCKED in the FarmMarketplace smart contract (Escrow Created).\n2. Farmer ships → buyer receives the produce.\n3. Delivery is confirmed → the contract RELEASES the payment to the farmer.\n4. If the order is cancelled before delivery → the contract REFUNDS the buyer.\nNeither side can take the money early, so both are protected.',
    followUps: ['What happens after delivery confirmation?', 'How does blockchain verification work?'],
  },
  {
    id: 'escrow-after-delivery',
    role: 'both',
    category: 'escrow',
    question: 'What happens after delivery confirmation?',
    keywords: ['after delivery', 'delivery confirmation', 'delivery confirmed', 'confirm delivery', 'release payment', 'released', 'mark delivered'],
    answer:
      'When the order is marked as Delivered, the backend calls confirmDelivery on the smart contract. The escrow status changes from Locked → Released and the amount is transferred to the farmer\'s wallet address. A "Payment Released" record appears in Blockchain Transactions for both the farmer and the buyer.',
    followUps: ['How does blockchain escrow work?', 'How do I see my blockchain transactions?'],
  },
  {
    id: 'blockchain-verification',
    role: 'both',
    category: 'blockchain',
    question: 'How does blockchain verification work?',
    keywords: ['blockchain', 'verification', 'verified', 'verify', 'transaction hash', 'tx hash', 'hash', 'ledger', 'immutable', 'tamper', 'ethereum', 'hardhat', 'solidity'],
    answer:
      'Every important action is written to the FarmMarketplace smart contract on an Ethereum network:\n• Product Registration — the product is listed on-chain with the farmer\'s wallet.\n• Escrow Created — the buyer\'s payment is locked.\n• Payment Released / Refund Issued — money moves out of escrow.\nEach action gets a transaction hash that cannot be changed later, so anyone can verify what happened and when. Products with an on-chain record show a "Verified" badge.',
    followUps: ['How do I see my blockchain transactions?', 'How does blockchain escrow work?'],
  },
  {
    id: 'transactions-screen',
    role: 'both',
    category: 'blockchain',
    question: 'How do I see my blockchain transactions?',
    keywords: ['transaction history', 'transactions', 'blockchain transactions', 'view transactions', 'my transactions', 'block number', 'wallet address', 'wallet'],
    answer:
      'Open your dashboard and tap "Blockchain Transactions". Each card shows the transaction hash, order number, amount, escrow status and wallet address. Tap a card for the full detail (block number, buyer and farmer wallets) and use "Copy Transaction Hash" to share it. Use the filter chips or search by hash, order number, buyer or farmer.',
    route: 'Dashboard → Blockchain Transactions',
  },
  {
    id: 'payment-methods',
    role: 'both',
    category: 'payments',
    question: 'What payment methods are available?',
    keywords: ['payment method', 'payment methods', 'pay', 'payment', 'cash', 'bank transfer', 'razorpay', 'upi', 'how to pay'],
    answer:
      'Supported payment methods:\n• Blockchain Escrow — payment locked in a smart contract until delivery (recommended, fully protected).\n• Razorpay — cards, UPI and net banking.\n• Cash on Delivery — pay when produce arrives.\n• Bank Transfer — direct transfer to the farmer.\nOnly Blockchain Escrow creates on-chain transaction records.',
    followUps: ['How does blockchain escrow work?'],
  },
  {
    id: 'organic-tips',
    role: 'both',
    category: 'farming',
    question: 'Organic farming tips',
    keywords: ['organic', 'organic farming', 'chemical free', 'natural farming', 'compost', 'vermicompost', 'manure', 'jeevamrutha', 'pesticide free', 'bio fertilizer'],
    answer:
      'Organic farming tips 🌿\n• Build soil health with compost, vermicompost and farmyard manure instead of chemical fertilisers.\n• Use neem oil, jeevamrutha or panchagavya for natural pest and disease control.\n• Rotate crops and grow legumes (beans, groundnut) to fix nitrogen.\n• Mulch with straw or dry leaves to keep moisture and stop weeds.\n• Attract pollinators and beneficial insects with border flowers like marigold.\nMark your product as "Organic" when listing so buyers can filter for it.',
    followUps: ['Crop management tips', 'How do I improve my product visibility?'],
  },
  {
    id: 'crop-management',
    role: 'both',
    category: 'farming',
    question: 'Crop management tips',
    keywords: ['crop', 'crops', 'crop management', 'yield', 'irrigation', 'watering', 'soil', 'fertilizer', 'fertiliser', 'seed', 'sowing', 'harvest', 'pest', 'disease', 'weather', 'monsoon'],
    answer:
      'Crop management basics 🌾\n• Test soil every season and add nutrients only where needed.\n• Use drip or sprinkler irrigation; water early morning to reduce evaporation.\n• Choose certified seeds suited to your region and season (kharif / rabi).\n• Scout fields weekly for pests and disease; act early with targeted, low-toxicity control.\n• Harvest at the right maturity and cool produce quickly to keep it fresh longer.\n• Keep simple records of inputs, dates and yields to plan the next season.',
    followUps: ['Organic farming tips', 'Best practices for selling produce'],
  },
  {
    id: 'account-language',
    role: 'both',
    category: 'account',
    question: 'How do I change language or theme?',
    keywords: ['language', 'hindi', 'kannada', 'malayalam', 'translate', 'theme', 'dark mode', 'light mode', 'settings'],
    answer:
      'Use the language selector (globe icon) in this chat header or on your dashboard to switch between English, Hindi, Kannada and Malayalam. The theme toggle on your dashboard switches between light and dark mode.',
  },
  {
    id: 'logout',
    role: 'both',
    category: 'account',
    question: 'How do I log out?',
    keywords: ['logout', 'log out', 'sign out', 'switch account', 'change account'],
    answer: 'Tap the log-out icon at the top-right of your dashboard. You will return to the login screen and can sign in with another account.',
  },
  {
    id: 'contact-support',
    role: 'both',
    category: 'support',
    question: 'How do I contact support?',
    keywords: ['support', 'contact', 'complaint', 'problem', 'issue', 'bug', 'not working', 'error', 'admin'],
    answer:
      'For order problems, raise a dispute from the order itself — an admin reviews it and can release or refund the escrow. For app issues, note what you were doing and the error message and share it with the marketplace admin.',
  },
];
