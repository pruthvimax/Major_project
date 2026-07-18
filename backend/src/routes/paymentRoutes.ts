import express from 'express';
import {
  initiateRazorpayPayment,
  verifyRazorpayPaymentHandler,
  addTrackingEvent,
  getOrderTracking,
} from '../controllers/paymentController';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

router.use(protect);

// Razorpay payment flow
router.post('/razorpay/create', restrictTo('buyer'), initiateRazorpayPayment);
router.post('/razorpay/verify', restrictTo('buyer'), verifyRazorpayPaymentHandler);

// Real-time order tracking
router.get('/tracking/:orderId', getOrderTracking);
router.post('/tracking/:orderId', restrictTo('farmer', 'admin'), addTrackingEvent);

export default router;
