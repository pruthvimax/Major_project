import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import api from './api';
import type { BusinessAnalytics, ReportType } from '../types/analytics.types';
import { REPORT_META } from '../types/analytics.types';

/**
 * Revenue & growth analytics API client (admin only).
 */

export const fetchBusinessAnalytics = async (): Promise<BusinessAnalytics> => {
  const response = await api.get('/admin/business-analytics');
  return response.data.analytics as BusinessAnalytics;
};

/** Downloads a CSV report as text (the JWT interceptor adds the auth header). */
export const fetchReportCsv = async (type: ReportType): Promise<string> => {
  const response = await api.get(`/admin/reports/${type}/export`, {
    responseType: 'text',
    transformResponse: [(data) => data],
  });
  return typeof response.data === 'string' ? response.data : String(response.data ?? '');
};

export type ExportOutcome = 'downloaded' | 'shared' | 'copied' | 'dismissed';

/**
 * Hands the CSV to the user without any extra native dependency:
 *  - web: triggers a real file download
 *  - iOS/Android (Expo Go): opens the system share sheet; if the user
 *    dismisses it, the CSV is also placed on the clipboard as a fallback.
 */
export const exportReport = async (type: ReportType): Promise<ExportOutcome> => {
  const csv = await fetchReportCsv(type);
  const filename = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }

  const result = await Share.share(
    { title: REPORT_META[type].label, message: csv },
    { dialogTitle: `${REPORT_META[type].label} (${filename})`, subject: filename }
  );
  if (result.action === Share.sharedAction) return 'shared';

  await Clipboard.setStringAsync(csv);
  return 'copied';
};

// ---- Formatting helpers ----------------------------------------------------

/** ₹12,45,000 — Indian digit grouping, no decimals. */
export const formatINR = (value: number | null | undefined): string => {
  const n = Number(value) || 0;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

/** ₹12.4L / ₹1.2Cr / ₹45k — short form for tiles and chart labels. */
export const formatINRShort = (value: number | null | undefined): string => {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2).replace(/\.?0+$/, '')}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2).replace(/\.?0+$/, '')}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1).replace(/\.?0+$/, '')}k`;
  return `${sign}₹${Math.round(abs)}`;
};

export const formatCompact = (value: number | null | undefined): string => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(n));
};

export const formatGrowth = (pct: number | null | undefined): string => {
  if (pct === null || pct === undefined) return 'New';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1).replace(/\.0$/, '')}%`;
};
