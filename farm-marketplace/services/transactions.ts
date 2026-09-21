import api from './api';
import type { TransactionRecord, TransactionTypeFilter } from '../types/transaction.types';

/**
 * Blockchain Transaction History API client.
 * The backend scopes results by the JWT's role, so the same calls work for
 * farmers (own transactions), buyers (own transactions) and admins (all).
 */

export interface FetchTransactionsParams {
  type?: TransactionTypeFilter;
  search?: string;
  limit?: number;
}

export const fetchTransactionHistory = async (
  params: FetchTransactionsParams = {}
): Promise<TransactionRecord[]> => {
  const query: Record<string, string> = {};
  if (params.type && params.type !== 'all') query.type = params.type;
  if (params.search && params.search.trim()) query.search = params.search.trim();
  if (params.limit) query.limit = String(params.limit);

  const response = await api.get('/transactions', { params: query });
  if (response.data?.success) {
    return response.data.transactions as TransactionRecord[];
  }
  return [];
};

export const fetchTransactionDetail = async (txHash: string): Promise<TransactionRecord | null> => {
  const response = await api.get(`/transactions/${encodeURIComponent(txHash)}`);
  if (response.data?.success) {
    return response.data.transaction as TransactionRecord;
  }
  return null;
};

/** `0xabcd…1234` style shortening for hashes and wallet addresses. */
export const shortenHash = (value: string | null | undefined, head = 8, tail = 6): string => {
  if (!value) return '—';
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
};

export const formatTxDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
};
