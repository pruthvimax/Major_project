import api from '../api';
import { logApiError } from '../apiError';
import type { ChatRole, FAQEntry } from '../../data/faqs/types';
import { getFaqsForRole, QUICK_ACTIONS } from '../../data/faqs';
import { matchFaq, tokenize, confidenceThreshold, type MatchResult } from './matcher';

/**
 * Local AI assistant — decides how to answer a message.
 *
 *   message ─► follow-up? ("more", "yes") ─► answer the last entry's follow-up
 *          ─► FAQ match (confident)      ─► local answer
 *                 └─ entry.source === 'server' ─► existing /api/ai/chat
 *                                                 (live products / order counts),
 *                                                 local answer if offline
 *          ─► non-English language        ─► /api/ai/chat (multilingual),
 *                                             local answer as fallback
 *          ─► weak match                  ─► "Did you mean…" suggestions
 *          ─► nothing                     ─► friendly fallback + quick actions
 */

export interface AssistantContext {
  role: ChatRole;
  language: string;
  /** Id of the FAQ entry answered last, for context-aware follow-ups. */
  lastEntryId?: string | null;
}

export interface AssistantReply {
  text: string;
  entryId: string | null;
  suggestions: string[];
  source: 'local' | 'server' | 'fallback';
}

const FOLLOW_UP_WORDS = new Set(['more', 'yes', 'yeah', 'yep', 'sure', 'continue', 'next', 'explain', 'detail', 'details', 'elaborate', 'go on']);

const findEntry = (role: ChatRole, id: string | null | undefined): FAQEntry | undefined =>
  id ? getFaqsForRole(role).find((e) => e.id === id) : undefined;

const pickSuggestions = (role: ChatRole, entry: FAQEntry | null, exclude: string[] = []): string[] => {
  const base = entry?.followUps?.length ? entry.followUps : [];
  const pool = [...base, ...QUICK_ACTIONS[role]];
  const seen = new Set<string>(exclude);
  const out: string[] = [];
  for (const q of pool) {
    if (!seen.has(q)) {
      seen.add(q);
      out.push(q);
    }
    if (out.length >= 4) break;
  }
  return out;
};

const withRouteHint = (entry: FAQEntry): string =>
  entry.route ? `${entry.answer}\n\n📍 ${entry.route}` : entry.answer;

const askServer = async (message: string, language: string): Promise<string | null> => {
  try {
    const response = await api.post('/ai/chat', { message, language });
    if (response.data?.success && typeof response.data.reply === 'string') {
      return response.data.reply;
    }
    return null;
  } catch (error) {
    logApiError('Assistant server fallback', error);
    return null;
  }
};

const localReply = (role: ChatRole, match: MatchResult): AssistantReply => ({
  text: withRouteHint(match.entry),
  entryId: match.entry.id,
  suggestions: pickSuggestions(role, match.entry, [match.entry.question]),
  source: 'local',
});

const fallbackReply = (role: ChatRole, alternatives: MatchResult[]): AssistantReply => {
  const didYouMean = alternatives.map((a) => a.entry.question);
  const text =
    didYouMean.length > 0
      ? 'I am not fully sure what you mean. Did you mean one of these?'
      : role === 'farmer'
        ? 'I did not catch that. I can help with listing products, managing stock and orders, escrow payments, blockchain verification and farming tips. Try one of the questions below.'
        : 'I did not catch that. I can help with finding products, placing and tracking orders, payment methods, escrow protection, delivery and refunds. Try one of the questions below.';
  return {
    text,
    entryId: null,
    suggestions: didYouMean.length > 0 ? didYouMean.slice(0, 3) : QUICK_ACTIONS[role].slice(0, 4),
    source: 'fallback',
  };
};

export const askAssistant = async (message: string, context: AssistantContext): Promise<AssistantReply> => {
  const { role, language } = context;
  const trimmed = message.trim();
  if (!trimmed) return fallbackReply(role, []);

  // 1. Context-aware follow-ups: "more", "yes", "explain" → continue last topic.
  const tokens = tokenize(trimmed);
  const isFollowUp = tokens.length > 0 && tokens.length <= 2 && tokens.every((t) => FOLLOW_UP_WORDS.has(t));
  if (isFollowUp) {
    const last = findEntry(role, context.lastEntryId);
    const nextQuestion = last?.followUps?.[0];
    if (nextQuestion) {
      const next = matchFaq(nextQuestion, role).best;
      if (next) return localReply(role, next);
    }
  }

  // 2. Local knowledge base.
  const { best, alternatives } = matchFaq(trimmed, role);
  const confident = best && best.score >= confidenceThreshold(tokens) ? best : null;

  // 3. Live-data intents go to the existing backend assistant.
  if (confident && confident.entry.source === 'server') {
    const serverText = await askServer(trimmed, language);
    if (serverText) {
      return {
        text: serverText,
        entryId: confident.entry.id,
        suggestions: pickSuggestions(role, confident.entry, [confident.entry.question]),
        source: 'server',
      };
    }
    return localReply(role, confident);
  }

  // 4. Non-English: the backend already replies in Hindi / Kannada / Malayalam.
  if (language !== 'en') {
    const serverText = await askServer(trimmed, language);
    if (serverText) {
      return {
        text: serverText,
        entryId: confident?.entry.id ?? null,
        suggestions: pickSuggestions(role, confident?.entry ?? null),
        source: 'server',
      };
    }
  }

  if (confident) return localReply(role, confident);

  // 5. Weak match → suggestions; nothing → friendly fallback.
  const options = best ? [best, ...alternatives] : alternatives;
  return fallbackReply(role, options);
};

export const getWelcomeMessage = (role: ChatRole, name?: string): string => {
  const who = name ? `, ${name.split(' ')[0]}` : '';
  return role === 'farmer'
    ? `Hello${who}! 🌱 I am your Krishi Assistant. Ask me how to list products, manage orders, receive escrow payments, or for farming tips.`
    : `Hello${who}! 🧺 I am your Krishi Assistant. Ask me how to find products, place and track orders, or how blockchain escrow protects your payment.`;
};
