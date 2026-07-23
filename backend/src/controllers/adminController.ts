import { Request, Response } from 'express';
import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';
import Transaction from '../models/Transaction';

// @desc    Admin dashboard analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
export const getAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalFarmers,
      totalBuyers,
      totalProducts,
      totalOrders,
      blockchainTxCount,
      revenueAgg,
      recentOrders,
      topProducts,
      topFarmers,
      topBuyers,
      recentTransactions,
      recentUsers,
      disputedOrders,
    ] = await Promise.all([
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'buyer' }),
      Product.countDocuments(),
      Order.countDocuments(),
      Transaction.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' }, paymentStatus: 'paid' } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
      ]),
      Order.find()
        .populate('buyer', 'name email')
        .populate('farmer', 'name email')
        .populate('items.product', 'name')
        .sort({ createdAt: -1 })
        .limit(8),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            soldQty: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          },
        },
        { $sort: { soldQty: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            productId: '$_id',
            name: '$product.name',
            soldQty: 1,
            revenue: 1,
          },
        },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: '$farmer',
            orderCount: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'farmer',
          },
        },
        { $unwind: { path: '$farmer', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            farmerId: '$_id',
            name: '$farmer.name',
            email: '$farmer.email',
            orderCount: 1,
            revenue: 1,
          },
        },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: '$buyer',
            orderCount: { $sum: 1 },
            spent: { $sum: '$totalAmount' },
          },
        },
        { $sort: { spent: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'buyer',
          },
        },
        { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            buyerId: '$_id',
            name: '$buyer.name',
            email: '$buyer.email',
            orderCount: 1,
            spent: 1,
          },
        },
      ]),
      Transaction.find().sort({ createdAt: -1 }).limit(10),
      User.find({ role: { $ne: 'admin' } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email role createdAt isSuspended'),
      Order.find({ verificationStatus: 'disputed' })
        .populate('buyer', 'name')
        .populate('farmer', 'name')
        .limit(10),
    ]);

    const revenue = revenueAgg[0]?.revenue || 0;

    // Simple monthly revenue for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' },
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const activities = [
      ...recentOrders.slice(0, 5).map((o: any) => ({
        type: 'order',
        message: `Order ${o.orderNumber} — ${o.status}`,
        amount: o.totalAmount,
        createdAt: o.createdAt,
      })),
      ...recentUsers.map((u: any) => ({
        type: 'user',
        message: `New ${u.role}: ${u.name}`,
        createdAt: u.createdAt,
      })),
      ...recentTransactions.slice(0, 5).map((t: any) => ({
        type: 'blockchain',
        message: `${t.type} — ${t.txHash?.substring(0, 14)}...`,
        amount: t.amount,
        createdAt: t.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12);

    res.status(200).json({
      success: true,
      analytics: {
        cards: {
          totalFarmers,
          totalBuyers,
          totalProducts,
          totalOrders,
          revenue,
          blockchainTransactions: blockchainTxCount,
          disputedOrders: disputedOrders.length,
        },
        recentOrders,
        monthlyRevenue,
        mostSoldProducts: topProducts,
        topFarmers,
        topBuyers,
        latestActivities: activities,
        disputedOrders,
      },
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    List blockchain transactions
// @route   GET /api/admin/transactions
export const getAdminTransactions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await Transaction.find()
      .populate('userId', 'name email role')
      .populate('orderId', 'orderNumber')
      .populate('productId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
