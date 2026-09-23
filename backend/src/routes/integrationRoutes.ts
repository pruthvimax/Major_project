import express from 'express';
import {
  handleOrderStatusCallback,
  integrationHealth,
  resyncOrder,
  deliveryMetrics,
} from '../controllers/integrationController';
import { verifyLogisticsWebhook } from '../middleware/verifyLogisticsWebhook';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

// Server-to-server (Agri Agent) — API key, no user JWT
router.post('/order-status', verifyLogisticsWebhook, handleOrderStatusCallback);
router.get('/health', verifyLogisticsWebhook, integrationHealth);

// Admin tools — normal JWT auth
router.post('/orders/:id/sync', protect, restrictTo('admin'), resyncOrder);
router.get('/metrics', protect, restrictTo('admin'), deliveryMetrics);

export default router;
