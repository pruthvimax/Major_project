import express from 'express';
import { createReview, getProductReviews, getFarmerReviews } from '../controllers/reviewController';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

// Public route — get reviews for a specific product
router.get('/product/:productId', getProductReviews);

// Protected routes
router.use(protect);

// Farmer route — get all reviews for the logged-in farmer's products
router.get('/farmer', restrictTo('farmer'), getFarmerReviews);

// Buyer route — create a review
router.post('/', restrictTo('buyer'), createReview);

export default router;
