import express from 'express';
import { getAnalytics, getAdminTransactions } from '../controllers/adminController';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/analytics', getAnalytics);
router.get('/transactions', getAdminTransactions);

export default router;
