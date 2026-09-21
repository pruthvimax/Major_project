import type { ChatRole, FAQEntry } from './types';
import { commonFaqs } from './commonFaqs';
import { farmerFaqs } from './farmerFaqs';
import { buyerFaqs } from './buyerFaqs';

export type { ChatRole, FAQEntry, FAQCategory } from './types';
export { commonFaqs, farmerFaqs, buyerFaqs };

/** All FAQ entries a given role is allowed to see (role-specific first). */
export const getFaqsForRole = (role: ChatRole): FAQEntry[] =>
  role === 'farmer' ? [...farmerFaqs, ...commonFaqs] : [...buyerFaqs, ...commonFaqs];

/** Quick-action chips shown when the chat opens. */
export const QUICK_ACTIONS: Record<ChatRole, string[]> = {
  farmer: [
    'How do I add a product?',
    'How do I receive payment?',
    'How does blockchain escrow work?',
    'What happens after delivery confirmation?',
    'How do I improve my product visibility?',
    'Organic farming tips',
  ],
  buyer: [
    'How do I place an order?',
    'How does escrow protect me?',
    'How do I track my order?',
    'How can I request a refund?',
    'What products are available now?',
    'What is the delivery process?',
  ],
};
