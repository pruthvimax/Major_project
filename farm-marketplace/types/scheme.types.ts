import type { Ionicons } from '@expo/vector-icons';

export const SCHEME_CATEGORIES = [
  'PM-KISAN',
  'Crop Insurance',
  'Subsidies',
  'Equipment Assistance',
  'Irrigation Support',
  'State Government Schemes',
  'Organic Farming Support',
  'Other',
] as const;

export type SchemeCategory = (typeof SCHEME_CATEGORIES)[number];

export const SCHEME_LABELS = ['new', 'popular', 'expiring_soon'] as const;
export type SchemeLabel = (typeof SCHEME_LABELS)[number];

export const SCHEME_QUERY_STATUSES = ['open', 'answered', 'resolved'] as const;
export type SchemeQueryStatus = (typeof SCHEME_QUERY_STATUSES)[number];

export interface Scheme {
  _id: string;
  name: string;
  description: string;
  benefits: string;
  eligibility: string;
  requiredDocuments: string[];
  applicationDeadline: string | null;
  officialWebsite: string;
  contactNumber: string;
  category: SchemeCategory;
  isActive: boolean;
  labels: SchemeLabel[];
  viewCount: number;
  savedCount: number;
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchemeQuery {
  _id: string;
  scheme: { _id: string; name: string; category: SchemeCategory; isActive: boolean } | null;
  farmer: { _id: string; name: string; email?: string; phone?: string } | null;
  question: string;
  status: SchemeQueryStatus;
  adminResponse: string;
  respondedBy?: { _id: string; name: string } | null;
  respondedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SchemeAnalytics {
  totalSchemes: number;
  activeSchemes: number;
  totalQueries: number;
  resolvedQueries: number;
  openQueries: number;
  mostViewedScheme: { _id: string; name: string; category: SchemeCategory; viewCount: number } | null;
}

/** Payload accepted by POST /schemes and PUT /schemes/:id. */
export interface SchemeInput {
  name: string;
  description: string;
  benefits: string;
  eligibility: string;
  requiredDocuments: string[];
  applicationDeadline: string | null;
  officialWebsite: string;
  contactNumber: string;
  category: SchemeCategory;
  labels: SchemeLabel[];
  isActive: boolean;
}

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Icon + short label per category — shared by farmer and admin screens. */
export const SCHEME_CATEGORY_META: Record<SchemeCategory, { icon: IoniconName; short: string }> = {
  'PM-KISAN': { icon: 'cash-outline', short: 'PM-KISAN' },
  'Crop Insurance': { icon: 'shield-checkmark-outline', short: 'Insurance' },
  Subsidies: { icon: 'pricetags-outline', short: 'Subsidies' },
  'Equipment Assistance': { icon: 'construct-outline', short: 'Equipment' },
  'Irrigation Support': { icon: 'water-outline', short: 'Irrigation' },
  'State Government Schemes': { icon: 'business-outline', short: 'State Schemes' },
  'Organic Farming Support': { icon: 'leaf-outline', short: 'Organic' },
  Other: { icon: 'document-text-outline', short: 'Other' },
};

export const SCHEME_LABEL_META: Record<SchemeLabel, { label: string; icon: IoniconName }> = {
  new: { label: 'New', icon: 'sparkles-outline' },
  popular: { label: 'Popular', icon: 'flame-outline' },
  expiring_soon: { label: 'Expiring Soon', icon: 'hourglass-outline' },
};

export const SCHEME_QUERY_STATUS_META: Record<SchemeQueryStatus, { label: string; icon: IoniconName }> = {
  open: { label: 'Open', icon: 'help-circle-outline' },
  answered: { label: 'Answered', icon: 'chatbubble-ellipses-outline' },
  resolved: { label: 'Resolved', icon: 'checkmark-circle-outline' },
};
