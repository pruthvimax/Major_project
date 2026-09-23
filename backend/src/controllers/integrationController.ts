import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  applyLogisticsUpdate,
  syncOrderToAgriAgent,
  getDeliveryMetrics,
  isLogisticsIntegrationConfigured,
} from '../services/logisticsIntegrationService';

// @desc    Agri Agent → Marketplace delivery status callback
// @route   POST /api/integration/order-status
// @access  Agri Agent (API key)
export const handleOrderStatusCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await applyLogisticsUpdate(req.body || {});
    res.status(result.httpStatus).json(result.body);
  } catch (error: any) {
    console.error('[Logistics] Callback error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Lets Agri Agent verify URL + API key
// @route   GET /api/integration/health
// @access  Agri Agent (API key)
export const integrationHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    service: 'farm-marketplace',
    outboundConfigured: isLogisticsIntegrationConfigured(),
    timestamp: new Date().toISOString(),
  });
};

// @desc    Retry pushing an order to Agri Agent
// @route   POST /api/integration/orders/:id/sync
// @access  Private/Admin
export const resyncOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, message: 'Invalid order id' });
      return;
    }
    const result = await syncOrderToAgriAgent(req.params.id);
    res.status(result.success ? 200 : 502).json({ ...result, success: result.success });
  } catch (error: any) {
    console.error('[Logistics] Resync error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delivery metrics for the admin dashboard
// @route   GET /api/integration/metrics
// @access  Private/Admin
export const deliveryMetrics = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, metrics: await getDeliveryMetrics() });
  } catch (error: any) {
    console.error('[Logistics] Metrics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
