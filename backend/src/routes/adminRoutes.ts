import express from 'express';
import { getAnalytics, getAdminTransactions } from '../controllers/adminController';
import { getBusinessAnalytics, exportReport } from '../controllers/businessAnalyticsController';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/analytics', getAnalytics);
router.get('/transactions', getAdminTransactions);

// Revenue, commission & growth intelligence (aggregated live from existing collections)
router.get('/business-analytics', getBusinessAnalytics);
router.get('/reports/:type/export', exportReport);

export default router;
