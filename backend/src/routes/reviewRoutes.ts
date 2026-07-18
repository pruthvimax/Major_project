import express from 'express';
import { createReview, getProductReviews } from '../controllers/reviewController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.get('/product/:productId', getProductReviews);
router.post('/', protect, createReview);

export default router;
