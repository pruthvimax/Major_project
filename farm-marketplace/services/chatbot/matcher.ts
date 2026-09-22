import type { ChatRole, FAQEntry } from '../../data/faqs/types';
import { getFaqsForRole } from '../../data/faqs';

/**
 * Local keyword-matching engine for the AI assistant.
 *
 * No network, no model — a small scoring function over the FAQ knowledge
 * base that tolerates typos, plurals and different word orders:
 *
 *   message ──► normalise ──► tokens ──► score every FAQ ──► best match
 *                (lowercase,   (stop-words   (phrase hits weigh
 *                 strip punct)  removed,      more than single
 *                               stemmed)      words; fuzzy ±1 char)
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'is', 'are', 'am', 'be',
  'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'to', 'of', 'in', 'on', 'for',
  'and', 'or', 'with', 'about', 'please', 'pls', 'plz', 'tell', 'know', 'want', 'need', 'like',
  'this', 'that', 'there', 'here', 'how', 'what', 'when', 'why', 'which', 'who', 'any',
  'some', 'get', 'have', 'has', 'from', 'by', 'at', 'as', 'so', 'if', 'then', 'just', 'also',
]);

/** Map common variants to the vocabulary used in FAQ keywords. */
const SYNONYMS: Record<string, string> = {
  produce: 'product',
  goods: 'product',
  item: 'product',
  items: 'product',
  crop: 'product',
  veg: 'vegetables',
  veggies: 'vegetables',
  vegetable: 'vegetables',
  fruit: 'fruits',
  grain: 'grains',
  purchase: 'buy',
  purchasing: 'buy',
  ordering: 'order',
  orders: 'order',
  shipment: 'shipped',
  ship: 'shipped',
  shipping: 'shipped',
  deliver: 'delivery',
  delivered: 'delivery',
  paid: 'payment',
  pay: 'payment',
  paying: 'payment',
  payments: 'payment',
  money: 'payment',
  cash: 'cash',
  cancelled: 'cancel',
  canceled: 'cancel',
  cancelling: 'cancel',
  refunded: 'refund',
  refunds: 'refund',
  stocks: 'stock',
  inventories: 'inventory',
  tracking: 'track',
  locate: 'track',
  register: 'add',
  registered: 'verified',
  verify: 'verification',
  verifies: 'verification',
  chain: 'blockchain',
  crypto: 'blockchain',
  eth: 'blockchain',
  contract: 'smart contract',
  hallo: 'hello',
  helo: 'hello',
  hii: 'hi',
  hiii: 'hi',
  thx: 'thanks',
  ty: 'thanks',
  tq: 'thanks',
  signout: 'logout',
  bye: 'thanks',
};

/** Light stemmer: plurals and common verb endings. */
export const stem = (word: string): string => {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
};

const normaliseWord = (word: string): string => {
  const lower = word.toLowerCase();
  const syn = SYNONYMS[lower];
  if (syn) return syn;
  const stemmed = stem(lower);
  return SYNONYMS[stemmed] || stemmed;
};

export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .flatMap((w) => normaliseWord(w).split(' '))
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));

/** Levenshtein distance capped at `max` (early exit keeps it cheap). */
const editDistance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
};

const wordsMatch = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5) {
    if (a.startsWith(b) || b.startsWith(a)) return true;
    return editDistance(a, b, 1) <= 1;
  }
  return false;
};

const includesWord = (tokens: string[], word: string): boolean =>
  tokens.some((t) => wordsMatch(t, word));

export interface MatchResult {
  entry: FAQEntry;
  score: number;
}

export interface MatchOutcome {
  best: MatchResult | null;
  /** Other plausible entries, for "Did you mean…" suggestions. */
  alternatives: MatchResult[];
  tokens: string[];
}

/** A match at or above this score is answered confidently. */
export const CONFIDENT_SCORE = 2;
/** Between this and CONFIDENT_SCORE we offer suggestions instead. */
export const SUGGEST_SCORE = 1;

export const scoreEntry = (entry: FAQEntry, tokens: string[]): number => {
  if (tokens.length === 0) return 0;
  let score = 0;
  let partial = 0;

  for (const keyword of entry.keywords) {
    const kwTokens = tokenize(keyword);
    if (kwTokens.length === 0) continue;

    if (kwTokens.length === 1) {
      if (includesWord(tokens, kwTokens[0])) score += 1.5;
      continue;
    }

    // Multi-word keyword: every word present (any order) scores; in-order
    // adjacency scores a bonus.
    const allPresent = kwTokens.every((kw) => includesWord(tokens, kw));
    if (allPresent) {
      score += 1.5 + kwTokens.length;
      const joined = tokens.join(' ');
      if (joined.includes(kwTokens.join(' '))) score += 1;
    } else {
      const hits = kwTokens.filter((kw) => includesWord(tokens, kw)).length;
      if (hits > 0) partial += hits * 0.25;
    }
  }

  // Partial phrase hits are weak evidence: cap them so many half-matching
  // phrases cannot outweigh one exact keyword.
  score += Math.min(partial, 1);

  // The canonical question also counts, lightly.
  const questionTokens = tokenize(entry.question);
  const overlap = questionTokens.filter((q) => includesWord(tokens, q)).length;
  score += overlap * 0.5;

  return score;
};

/** Short messages ("hi", "thanks", "refund") need less evidence to be confident. */
export const confidenceThreshold = (tokens: string[]): number =>
  tokens.length <= 2 ? 1.5 : CONFIDENT_SCORE;

export const matchFaq = (message: string, role: ChatRole): MatchOutcome => {
  const tokens = tokenize(message);
  const entries = getFaqsForRole(role);

  const scored: MatchResult[] = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((r) => r.score > 0)
    // Stable sort: higher score first; on ties the role-specific entry
    // (listed first) wins over shared knowledge.
    .sort((a, b) => b.score - a.score);

  const best = scored.length > 0 && scored[0].score >= SUGGEST_SCORE ? scored[0] : null;
  const alternatives = scored
    .slice(best ? 1 : 0, best ? 4 : 3)
    .filter((r) => r.score >= SUGGEST_SCORE && r.entry.category !== 'greeting');

  return { best, alternatives, tokens };
};
