/** Shape returned by GET /api/admin/business-analytics */

export interface RevenueBlock {
  total: number;
  totalOrders: number;
  completedOrders: number;
  thisMonth: number;
  lastMonth: number;
  today: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  ordersToday: number;
  /** % change vs last month; null when there is no baseline. */
  monthlyGrowth: number | null;
  orderGrowth: number | null;
}

export interface CommissionBlock {
  rate: number;
  ratePercent: number;
  total: number;
  thisMonth: number;
  lastMonth: number;
  today: number;
  growth: number | null;
}

export interface MonthlyPoint {
  key: string;
  label: string;
  year: number;
  revenue: number;
  orders: number;
  commission: number;
}

export interface GrowthBlock {
  total: number;
  newThisMonth: number;
  newLastMonth: number;
  active: number;
  /** New sign-ups this month vs last month. */
  growth: number | null;
  /** New sign-ups this month as % of the existing base. */
  baseGrowth: number | null;
}

export interface TopFarmer {
  _id: string;
  name: string;
  revenue: number;
  orders: number;
  averageRating: number;
  reviews: number;
}

export interface TopProduct {
  _id: string;
  name: string;
  category: string;
  isOrganic: boolean;
  orders: number;
  quantity: number;
  revenue: number;
  rating: number;
  reviewCount: number;
  bestSeller: boolean;
}

export interface CategoryPerformance {
  key: string;
  name: string;
  orders: number;
  revenue: number;
  share: number;
}

export interface BlockchainBlock {
  totalTransactions: number;
  confirmedTransactions: number;
  escrowTransactions: number;
  completedEscrows: number;
  refundedEscrows: number;
  lockedEscrows: number;
  chainVolume: number;
  escrowVolume: number;
}

export interface Insight {
  icon: string;
  text: string;
  tone: 'positive' | 'neutral' | 'warning';
}

export interface BusinessAnalytics {
  generatedAt: string;
  revenue: RevenueBlock;
  commission: CommissionBlock;
  monthly: MonthlyPoint[];
  farmers: GrowthBlock;
  buyers: GrowthBlock;
  topFarmers: TopFarmer[];
  topProducts: TopProduct[];
  categories: CategoryPerformance[];
  blockchain: BlockchainBlock;
  insights: Insight[];
}

export type ReportType = 'revenue' | 'farmers' | 'buyers' | 'monthly';

export const REPORT_META: Record<ReportType, { label: string; description: string }> = {
  revenue: { label: 'Revenue Report', description: 'Every paid order with commission' },
  farmers: { label: 'Farmer Report', description: 'All farmers with orders & revenue' },
  buyers: { label: 'Buyer Report', description: 'All buyers with orders & spend' },
  monthly: { label: 'Monthly Summary', description: 'Month-by-month totals' },
};
