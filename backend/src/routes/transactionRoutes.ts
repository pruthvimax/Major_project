import express from 'express';
import { getTransactionHistory, getTransactionDetail } from '../controllers/transactionController';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(restrictTo('farmer', 'buyer', 'admin'));

// Role-scoped blockchain transaction history
router.get('/', getTransactionHistory);
router.get('/:txHash', getTransactionDetail);

export default router;
