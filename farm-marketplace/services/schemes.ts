import api from './api';
import type {
  Scheme,
  SchemeAnalytics,
  SchemeCategory,
  SchemeInput,
  SchemeLabel,
  SchemeQuery,
  SchemeQueryStatus,
} from '../types/scheme.types';

/**
 * Government Schemes API client.
 * The backend scopes results by the JWT's role: farmers only ever receive
 * active schemes, admins receive everything (filterable by `status`).
 */

export interface FetchSchemesParams {
  category?: SchemeCategory | 'all';
  search?: string;
  saved?: boolean;
  label?: SchemeLabel;
  /** Admin only. */
  status?: 'all' | 'active' | 'inactive';
}

export const fetchSchemes = async (params: FetchSchemesParams = {}): Promise<Scheme[]> => {
  const query: Record<string, string> = {};
  if (params.category && params.category !== 'all') query.category = params.category;
  if (params.search && params.search.trim()) query.search = params.search.trim();
  if (params.saved) query.saved = 'true';
  if (params.label) query.label = params.label;
  if (params.status && params.status !== 'all') query.status = params.status;

  const response = await api.get('/schemes', { params: query });
  return response.data?.success ? (response.data.schemes as Scheme[]) : [];
};

export const fetchSchemeById = async (id: string): Promise<Scheme | null> => {
  const response = await api.get(`/schemes/${encodeURIComponent(id)}`);
  return response.data?.success ? (response.data.scheme as Scheme) : null;
};

export const createScheme = async (input: SchemeInput): Promise<Scheme> => {
  const response = await api.post('/schemes', input);
  return response.data.scheme as Scheme;
};

export const updateScheme = async (id: string, input: Partial<SchemeInput>): Promise<Scheme> => {
  const response = await api.put(`/schemes/${encodeURIComponent(id)}`, input);
  return response.data.scheme as Scheme;
};

export const deleteScheme = async (id: string): Promise<void> => {
  await api.delete(`/schemes/${encodeURIComponent(id)}`);
};

export const toggleSaveScheme = async (id: string): Promise<{ isSaved: boolean; scheme?: Scheme }> => {
  const response = await api.post(`/schemes/${encodeURIComponent(id)}/save`);
  return { isSaved: Boolean(response.data?.isSaved), scheme: response.data?.scheme as Scheme | undefined };
};

export const fetchSchemeAnalytics = async (): Promise<SchemeAnalytics> => {
  const response = await api.get('/schemes/analytics');
  return response.data.analytics as SchemeAnalytics;
};

// ---- Queries ---------------------------------------------------------------

export const submitSchemeQuery = async (schemeId: string, question: string): Promise<SchemeQuery> => {
  const response = await api.post(`/schemes/${encodeURIComponent(schemeId)}/queries`, { question });
  return response.data.query as SchemeQuery;
};

export const fetchMySchemeQueries = async (schemeId?: string): Promise<SchemeQuery[]> => {
  const response = await api.get('/schemes/queries/mine', {
    params: schemeId ? { schemeId } : undefined,
  });
  return response.data?.success ? (response.data.queries as SchemeQuery[]) : [];
};

export const fetchAllSchemeQueries = async (
  status?: SchemeQueryStatus | 'all'
): Promise<SchemeQuery[]> => {
  const response = await api.get('/schemes/queries', {
    params: status && status !== 'all' ? { status } : undefined,
  });
  return response.data?.success ? (response.data.queries as SchemeQuery[]) : [];
};

export const respondToSchemeQuery = async (
  queryId: string,
  body: { adminResponse?: string; status?: SchemeQueryStatus }
): Promise<SchemeQuery> => {
  const response = await api.put(`/schemes/queries/${encodeURIComponent(queryId)}`, body);
  return response.data.query as SchemeQuery;
};

// ---- Formatting helpers ----------------------------------------------------

export const formatSchemeDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Days until the deadline (negative when already passed, null when none). */
export const daysUntilDeadline = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
};

export const describeDeadline = (iso: string | null | undefined): string => {
  const days = daysUntilDeadline(iso);
  if (days === null) return 'No deadline';
  if (days < 0) return `Closed on ${formatSchemeDate(iso)}`;
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  if (days <= 30) return `${days} days left`;
  return `Apply by ${formatSchemeDate(iso)}`;
};

/** Converts a YYYY-MM-DD text field into an ISO string (or null / 'invalid'). */
export const parseDeadlineInput = (value: string): string | null | 'invalid' => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return 'invalid';
  const d = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'invalid';
  return d.toISOString();
};

export const toDeadlineInput = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};
