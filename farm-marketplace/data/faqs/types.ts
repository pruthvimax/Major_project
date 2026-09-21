/**
 * FAQ knowledge base types for the local AI assistant.
 *
 * Each entry is matched against the user's message by the keyword engine in
 * services/chatbot/matcher.ts. Keywords may be single words or short phrases;
 * phrases score higher than single words when they match.
 */

export type ChatRole = 'farmer' | 'buyer';

export type FAQCategory =
  | 'greeting'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'payments'
  | 'escrow'
  | 'blockchain'
  | 'delivery'
  | 'refunds'
  | 'selling'
  | 'farming'
  | 'marketplace'
  | 'account'
  | 'support';

export interface FAQEntry {
  /** Stable id, also used to avoid repeating the same answer twice in a row. */
  id: string;
  /** Which role may receive this answer. 'both' is shared knowledge. */
  role: ChatRole | 'both';
  category: FAQCategory;
  /** Canonical phrasing shown as a suggestion chip. */
  question: string;
  /** Words / phrases that trigger this entry. Lower-case. */
  keywords: string[];
  /** Plain-text answer. Use \n for line breaks and "•" for bullets. */
  answer: string;
  /** Follow-up questions suggested after this answer. */
  followUps?: string[];
  /**
   * 'server' — the answer needs live data (product list, order count), so the
   * assistant forwards the message to the existing /api/ai/chat endpoint and
   * uses this entry's answer only if the server is unreachable.
   */
  source?: 'local' | 'server';
  /** Optional in-app screen the answer relates to (shown as a hint). */
  route?: string;
}
