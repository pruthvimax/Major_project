import { Request, Response } from 'express';
import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';
import Review from '../models/Review';
import Transaction from '../models/Transaction';

/**
 * Platform Commission & Revenue Analytics
 * ----------------------------------------
 * Every figure here is aggregated live from the existing collections
 * (users, products, orders, reviews, transactions). No new collections.
 *
 * Definitions (kept consistent with GET /api/admin/analytics):
 *   revenue-bearing order = paymentStatus 'paid' AND status != 'cancelled'
 *   completed order        = status 'delivered'
 *   commission             = revenue × PLATFORM_COMMISSION_RATE (default 2 %)
 *   active farmer/buyer    = had a revenue-bearing order in the last 30 days
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Commission rate as a fraction. `PLATFORM_COMMISSION_RATE=2` → 0.02. */
export const getCommissionRate = (): number => {
  const raw = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '2');
  if (Number.isNaN(raw) || raw < 0) return 0.02;
  return raw > 1 ? raw / 100 : raw;
};

const REVENUE_MATCH = { paymentStatus: 'paid', status: { $ne: 'cancelled' } };

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfPrevMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() - 1, 1);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const round2 = (n: number) => Math.round((n || 0) * 100) / 100;

/** Percentage change, null when there is no baseline. */
const growthPct = (current: number, previous: number): number | null => {
  if (!previous) return current > 0 ? null : 0;
  return round2(((current - previous) / previous) * 100);
};

const sumRevenue = async (extra: Record<string, unknown> = {}) => {
  const [row] = await Order.aggregate([
    { $match: { ...REVENUE_MATCH, ...extra } },
    { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
  ]);
  return { revenue: round2(row?.revenue || 0), orders: (row?.orders as number) || 0 };
};

const countActiveRole = async (field: 'farmer' | 'buyer') => {
  const rows = await Order.aggregate([
    { $match: { ...REVENUE_MATCH, createdAt: { $gte: daysAgo(30) } } },
    { $group: { _id: `$${field}` } },
    { $count: 'n' },
  ]);
  return (rows[0]?.n as number) || 0;
};

const CATEGORY_LABELS: Record<string, string> = {
  vegetables: 'Vegetables',
  fruits: 'Fruits',
  grains: 'Grains',
  organic: 'Organic',
  dairy: 'Dairy',
  meat: 'Meat',
  poultry: 'Poultry',
  other: 'Other',
};

const formatINR = (n: number) =>
  `₹${Math.round(n).toLocaleString('en-IN')}`;

// ---------------------------------------------------------------------------
// Core aggregation (shared by the JSON endpoint and the CSV exports)
// ---------------------------------------------------------------------------

const buildBusinessAnalytics = async () => {
  const now = new Date();
  const rate = getCommissionRate();
  const thisMonthStart = startOfMonth(now);
  const prevMonthStart = startOfPrevMonth(now);
  const todayStart = startOfDay(now);

  // Six calendar months including the current one.
  const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    allTime,
    thisMonth,
    lastMonth,
    today,
    completedOrders,
    monthlyRows,
    totalFarmers,
    totalBuyers,
    newFarmersThisMonth,
    newFarmersLastMonth,
    newBuyersThisMonth,
    newBuyersLastMonth,
    activeFarmers,
    activeBuyers,
    topFarmersRaw,
    farmerRatings,
    topProductsRaw,
    categoryRows,
    txTotals,
    escrowRows,
    orgRating,
    nonOrgRating,
  ] = await Promise.all([
    sumRevenue(),
    sumRevenue({ createdAt: { $gte: thisMonthStart } }),
    sumRevenue({ createdAt: { $gte: prevMonthStart, $lt: thisMonthStart } }),
    sumRevenue({ createdAt: { $gte: todayStart } }),
    Order.countDocuments({ status: 'delivered' }),
    Order.aggregate([
      { $match: { ...REVENUE_MATCH, createdAt: { $gte: sixMonthsStart } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
    ]),
    User.countDocuments({ role: 'farmer' }),
    User.countDocuments({ role: 'buyer' }),
    User.countDocuments({ role: 'farmer', createdAt: { $gte: thisMonthStart } }),
    User.countDocuments({ role: 'farmer', createdAt: { $gte: prevMonthStart, $lt: thisMonthStart } }),
    User.countDocuments({ role: 'buyer', createdAt: { $gte: thisMonthStart } }),
    User.countDocuments({ role: 'buyer', createdAt: { $gte: prevMonthStart, $lt: thisMonthStart } }),
    countActiveRole('farmer'),
    countActiveRole('buyer'),
    Order.aggregate([
      { $match: REVENUE_MATCH },
      { $group: { _id: '$farmer', revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'farmer' } },
      { $unwind: { path: '$farmer', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, name: '$farmer.name', revenue: 1, orders: 1 } },
    ]),
    // Average rating per farmer, derived from reviews on their products.
    Review.aggregate([
      { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $group: { _id: '$product.farmer', avgRating: { $avg: '$rating' }, reviews: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: REVENUE_MATCH },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          orders: { $sum: 1 },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: '$product.name',
          category: '$product.category',
          isOrganic: '$product.isOrganic',
          rating: '$product.averageRating',
          reviewCount: '$product.reviewCount',
          orders: 1,
          quantity: 1,
          revenue: 1,
        },
      },
    ]),
    Order.aggregate([
      { $match: REVENUE_MATCH },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$product.category', 'other'] },
          orders: { $addToSet: '$_id' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        },
      },
      { $project: { _id: 1, orders: { $size: '$orders' }, revenue: 1 } },
      { $sort: { revenue: -1 } },
    ]),
    Transaction.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          volume: { $sum: '$amount' },
        },
      },
    ]),
    Order.aggregate([
      { $match: { paymentMethod: 'blockchain' } },
      {
        $group: {
          _id: null,
          escrowTransactions: { $sum: { $cond: [{ $ne: ['$escrowStatus', 'none'] }, 1, 0] } },
          completedEscrows: { $sum: { $cond: [{ $eq: ['$escrowStatus', 'released'] }, 1, 0] } },
          refundedEscrows: { $sum: { $cond: [{ $eq: ['$escrowStatus', 'refunded'] }, 1, 0] } },
          lockedEscrows: { $sum: { $cond: [{ $eq: ['$escrowStatus', 'locked'] }, 1, 0] } },
          escrowVolume: { $sum: { $cond: [{ $ne: ['$escrowStatus', 'none'] }, '$totalAmount', 0] } },
        },
      },
    ]),
    Product.aggregate([
      { $match: { isOrganic: true, reviewCount: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$averageRating' } } },
    ]),
    Product.aggregate([
      { $match: { isOrganic: false, reviewCount: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$averageRating' } } },
    ]),
  ]);

  // ---- Monthly series (fill gaps so the chart always has six bars) -------
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const hit = monthlyRows.find(
      (r: any) => r._id.year === d.getFullYear() && r._id.month === d.getMonth() + 1
    );
    const revenue = round2(hit?.revenue || 0);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MONTH_LABELS[d.getMonth()],
      year: d.getFullYear(),
      revenue,
      orders: (hit?.orders as number) || 0,
      commission: round2(revenue * rate),
    };
  });

  // ---- Farmer ratings joined onto the top-farmer list --------------------
  const ratingByFarmer = new Map<string, { avgRating: number; reviews: number }>();
  farmerRatings.forEach((r: any) => {
    if (r._id) ratingByFarmer.set(String(r._id), { avgRating: r.avgRating, reviews: r.reviews });
  });
  const topFarmers = topFarmersRaw.map((f: any) => {
    const rating = ratingByFarmer.get(String(f._id));
    return {
      _id: f._id,
      name: f.name || 'Farmer',
      revenue: round2(f.revenue),
      orders: f.orders as number,
      averageRating: rating ? round2(rating.avgRating) : 0,
      reviews: rating?.reviews || 0,
    };
  });

  const topProducts = topProductsRaw.map((p: any, idx: number) => ({
    _id: p._id,
    name: p.name || 'Product',
    category: CATEGORY_LABELS[p.category] || 'Other',
    isOrganic: Boolean(p.isOrganic),
    orders: p.orders as number,
    quantity: p.quantity as number,
    revenue: round2(p.revenue),
    rating: round2(p.rating || 0),
    reviewCount: (p.reviewCount as number) || 0,
    bestSeller: idx === 0,
  }));

  // ---- Category share -----------------------------------------------------
  const categoryTotal = categoryRows.reduce((acc: number, c: any) => acc + (c.revenue || 0), 0) || 0;
  const categories = categoryRows.map((c: any) => ({
    key: String(c._id),
    name: CATEGORY_LABELS[String(c._id)] || String(c._id),
    orders: c.orders as number,
    revenue: round2(c.revenue),
    share: categoryTotal ? round2((c.revenue / categoryTotal) * 100) : 0,
  }));

  // ---- Blockchain -----------------------------------------------------------
  const tx = txTotals[0] || {};
  const escrow = escrowRows[0] || {};
  const blockchain = {
    totalTransactions: (tx.total as number) || 0,
    confirmedTransactions: (tx.confirmed as number) || 0,
    escrowTransactions: (escrow.escrowTransactions as number) || 0,
    completedEscrows: (escrow.completedEscrows as number) || 0,
    refundedEscrows: (escrow.refundedEscrows as number) || 0,
    lockedEscrows: (escrow.lockedEscrows as number) || 0,
    /** Sum of on-chain tx amounts (native currency units as recorded). */
    chainVolume: round2(tx.volume || 0),
    /** INR value of orders that went through escrow. */
    escrowVolume: round2(escrow.escrowVolume || 0),
  };

  // ---- Growth blocks ------------------------------------------------------
  const revenue = {
    total: allTime.revenue,
    totalOrders: allTime.orders,
    completedOrders,
    thisMonth: thisMonth.revenue,
    lastMonth: lastMonth.revenue,
    today: today.revenue,
    ordersThisMonth: thisMonth.orders,
    ordersLastMonth: lastMonth.orders,
    ordersToday: today.orders,
    monthlyGrowth: growthPct(thisMonth.revenue, lastMonth.revenue),
    orderGrowth: growthPct(thisMonth.orders, lastMonth.orders),
  };

  const commission = {
    rate,
    ratePercent: round2(rate * 100),
    total: round2(allTime.revenue * rate),
    thisMonth: round2(thisMonth.revenue * rate),
    lastMonth: round2(lastMonth.revenue * rate),
    today: round2(today.revenue * rate),
    growth: growthPct(thisMonth.revenue, lastMonth.revenue),
  };

  const farmers = {
    total: totalFarmers,
    newThisMonth: newFarmersThisMonth,
    newLastMonth: newFarmersLastMonth,
    active: activeFarmers,
    growth: growthPct(newFarmersThisMonth, newFarmersLastMonth),
    /** New farmers this month as a share of the base before this month. */
    baseGrowth: totalFarmers - newFarmersThisMonth > 0
      ? round2((newFarmersThisMonth / (totalFarmers - newFarmersThisMonth)) * 100)
      : null,
  };

  const buyers = {
    total: totalBuyers,
    newThisMonth: newBuyersThisMonth,
    newLastMonth: newBuyersLastMonth,
    active: activeBuyers,
    growth: growthPct(newBuyersThisMonth, newBuyersLastMonth),
    baseGrowth: totalBuyers - newBuyersThisMonth > 0
      ? round2((newBuyersThisMonth / (totalBuyers - newBuyersThisMonth)) * 100)
      : null,
  };

  // ---- Insights (plain sentences generated from the numbers) --------------
  const insights: { icon: string; text: string; tone: 'positive' | 'neutral' | 'warning' }[] = [];

  if (categories.length > 0 && categoryTotal > 0) {
    const lead = categories[0];
    insights.push({
      icon: 'pie-chart-outline',
      text: `${lead.name} generated ${lead.share}% of total revenue (${formatINR(lead.revenue)}).`,
      tone: 'neutral',
    });
  }
  if (revenue.monthlyGrowth !== null && lastMonth.revenue > 0) {
    insights.push({
      icon: revenue.monthlyGrowth >= 0 ? 'trending-up-outline' : 'trending-down-outline',
      text: `Revenue is ${revenue.monthlyGrowth >= 0 ? 'up' : 'down'} ${Math.abs(revenue.monthlyGrowth)}% this month versus last month.`,
      tone: revenue.monthlyGrowth >= 0 ? 'positive' : 'warning',
    });
  } else if (thisMonth.revenue > 0) {
    insights.push({
      icon: 'sparkles-outline',
      text: `First revenue month on record: ${formatINR(thisMonth.revenue)} so far this month.`,
      tone: 'positive',
    });
  }
  if (buyers.growth !== null && newBuyersLastMonth > 0) {
    insights.push({
      icon: 'people-outline',
      text: `Buyer registrations ${buyers.growth >= 0 ? 'increased' : 'decreased'} by ${Math.abs(buyers.growth)}% this month.`,
      tone: buyers.growth >= 0 ? 'positive' : 'warning',
    });
  } else if (newBuyersThisMonth > 0) {
    insights.push({
      icon: 'people-outline',
      text: `${newBuyersThisMonth} new buyer${newBuyersThisMonth === 1 ? '' : 's'} joined this month.`,
      tone: 'positive',
    });
  }
  if (farmers.newThisMonth > 0) {
    insights.push({
      icon: 'leaf-outline',
      text: `${farmers.newThisMonth} farmer${farmers.newThisMonth === 1 ? '' : 's'} onboarded this month; ${farmers.active} of ${farmers.total} sold in the last 30 days.`,
      tone: 'neutral',
    });
  }
  const orgAvg = orgRating[0]?.avg as number | undefined;
  const nonOrgAvg = nonOrgRating[0]?.avg as number | undefined;
  if (orgAvg && nonOrgAvg) {
    insights.push({
      icon: 'star-outline',
      text:
        orgAvg >= nonOrgAvg
          ? `Organic products have the highest ratings (${round2(orgAvg)}★ vs ${round2(nonOrgAvg)}★ for others).`
          : `Conventional products currently out-rate organic ones (${round2(nonOrgAvg)}★ vs ${round2(orgAvg)}★).`,
      tone: 'neutral',
    });
  }
  if (topProducts[0]) {
    insights.push({
      icon: 'trophy-outline',
      text: `"${topProducts[0].name}" is the best seller with ${formatINR(topProducts[0].revenue)} across ${topProducts[0].orders} orders.`,
      tone: 'positive',
    });
  }
  if (blockchain.escrowTransactions > 0) {
    const successRate = round2((blockchain.completedEscrows / blockchain.escrowTransactions) * 100);
    insights.push({
      icon: 'shield-checkmark-outline',
      text: `${successRate}% of escrow orders completed successfully; ${blockchain.refundedEscrows} refunded.`,
      tone: successRate >= 80 ? 'positive' : 'warning',
    });
  }
  if (allTime.orders > 0) {
    insights.push({
      icon: 'cash-outline',
      text: `Platform commission at ${commission.ratePercent}% has earned ${formatINR(commission.total)} to date.`,
      tone: 'neutral',
    });
  }

  return {
    generatedAt: now.toISOString(),
    revenue,
    commission,
    monthly,
    farmers,
    buyers,
    topFarmers,
    topProducts,
    categories,
    blockchain,
    insights,
  };
};

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

// @desc    Revenue, commission & growth analytics
// @route   GET /api/admin/business-analytics
// @access  Private/Admin
export const getBusinessAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const analytics = await buildBusinessAnalytics();
    res.status(200).json({ success: true, analytics });
  } catch (error: any) {
    console.error('Business analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ---- CSV export -------------------------------------------------------------

const csvEscape = (value: unknown): string => {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (headers: string[], rows: unknown[][]): string =>
  [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n');

const fmtDate = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export const EXPORT_TYPES = ['revenue', 'farmers', 'buyers', 'monthly'] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

// @desc    Download a CSV report
// @route   GET /api/admin/reports/:type/export   (type: revenue | farmers | buyers | monthly)
// @access  Private/Admin
export const exportReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.params.type as ExportType;
    if (!EXPORT_TYPES.includes(type)) {
      res.status(400).json({ success: false, message: 'Unknown report type' });
      return;
    }

    const rate = getCommissionRate();
    let csv = '';

    if (type === 'revenue') {
      const orders = await Order.find(REVENUE_MATCH)
        .populate('buyer', 'name')
        .populate('farmer', 'name')
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean();
      csv = toCsv(
        ['Order Number', 'Date', 'Farmer', 'Buyer', 'Status', 'Payment Method', 'Order Amount (INR)', `Commission ${round2(rate * 100)}% (INR)`, 'Escrow Status'],
        orders.map((o: any) => [
          o.orderNumber,
          fmtDate(o.createdAt),
          o.farmer?.name || '',
          o.buyer?.name || '',
          o.status,
          o.paymentMethod,
          round2(o.totalAmount),
          round2(o.totalAmount * rate),
          o.escrowStatus,
        ])
      );
    } else if (type === 'farmers' || type === 'buyers') {
      const role = type === 'farmers' ? 'farmer' : 'buyer';
      const [users, stats] = await Promise.all([
        User.find({ role }).select('name email mobile address createdAt isVerified isSuspended').sort({ createdAt: -1 }).lean(),
        Order.aggregate([
          { $match: REVENUE_MATCH },
          { $group: { _id: `$${role}`, orders: { $sum: 1 }, revenue: { $sum: '$totalAmount' }, lastOrder: { $max: '$createdAt' } } },
        ]),
      ]);
      const byUser = new Map<string, any>(stats.map((s: any) => [String(s._id), s]));
      csv = toCsv(
        ['Name', 'Email', 'Mobile', 'Address', 'Joined', 'Verified', 'Suspended', 'Orders', role === 'farmer' ? 'Revenue (INR)' : 'Spent (INR)', 'Last Order'],
        users.map((u: any) => {
          const s = byUser.get(String(u._id));
          return [
            u.name,
            u.email,
            u.mobile,
            u.address,
            fmtDate(u.createdAt),
            u.isVerified ? 'Yes' : 'No',
            u.isSuspended ? 'Yes' : 'No',
            s?.orders || 0,
            round2(s?.revenue || 0),
            fmtDate(s?.lastOrder),
          ];
        })
      );
    } else {
      const rows = await Order.aggregate([
        { $match: REVENUE_MATCH },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
            farmers: { $addToSet: '$farmer' },
            buyers: { $addToSet: '$buyer' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);
      csv = toCsv(
        ['Month', 'Orders', 'Revenue (INR)', `Commission ${round2(rate * 100)}% (INR)`, 'Active Farmers', 'Active Buyers', 'Avg Order Value (INR)'],
        rows.map((r: any) => [
          `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
          r.orders,
          round2(r.revenue),
          round2(r.revenue * rate),
          r.farmers.length,
          r.buyers.length,
          r.orders ? round2(r.revenue / r.orders) : 0,
        ])
      );
    }

    const filename = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(`﻿${csv}`);
  } catch (error: any) {
    console.error('Export report error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
