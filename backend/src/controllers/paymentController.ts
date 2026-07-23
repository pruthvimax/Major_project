import { Request, Response } from 'express';
import Order from '../models/Order';
import { createRazorpayOrder, verifyRazorpayPayment } from '../services/paymentService';
import { sendPushNotification } from '../services/notificationService';

interface AuthRequest extends Request {
  user?: any;
}

// ─────────────────────────────────────────────
// RAZORPAY PAYMENT
// ─────────────────────────────────────────────

// @desc    Initiate Razorpay payment for an order
// @route   POST /api/payments/razorpay/create
// @access  Private/Buyer
export const initiateRazorpayPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;
    const buyerId = req.user?._id;

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (order.buyer.toString() !== buyerId.toString()) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (order.paymentStatus === 'paid') {
      res.status(400).json({ success: false, message: 'Order is already paid' });
      return;
    }

    const result = await createRazorpayOrder(order.totalAmount, order.orderNumber);

    if (!result.success) {
      res.status(500).json({ success: false, message: result.error || 'Payment initiation failed' });
      return;
    }

    // Store Razorpay order ID in the order document
    order.razorpayOrderId = result.razorpayOrderId;
    order.paymentMethod = 'razorpay';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Razorpay order created successfully',
      payment: {
        razorpayOrderId: result.razorpayOrderId,
        amount: result.amount,
        currency: result.currency,
        keyId: result.keyId,
        orderNumber: order.orderNumber,
        orderDbId: order._id,
      },
    });
  } catch (error: any) {
    console.error('Initiate Razorpay payment error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Verify Razorpay payment signature and mark order as paid
// @route   POST /api/payments/razorpay/verify
// @access  Private/Buyer
export const verifyRazorpayPaymentHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      res.status(400).json({ success: false, message: 'Missing payment verification fields' });
      return;
    }

    const isValid = verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      res.status(400).json({ success: false, message: 'Payment signature verification failed' });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Mark as paid and store payment ID
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpayPaymentId;
    order.status = 'accepted';

    // Add tracking event
    order.trackingEvents.push({
      status: 'accepted',
      message: 'Payment received via Razorpay. Order confirmed.',
      location: '',
      timestamp: new Date(),
    });

    await order.save();

    // Notify farmer about confirmed payment
    if (order.farmer) {
      sendPushNotification(
        order.farmer.toString(),
        'Payment Received 💰',
        `Payment of ₹${order.totalAmount} received for order ${order.orderNumber}.`
      ).catch(console.error);
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Order confirmed!',
      order,
    });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────
// REAL-TIME ORDER TRACKING
// ─────────────────────────────────────────────

// @desc    Add a tracking event to an order
// @route   POST /api/payments/tracking/:orderId
// @access  Private/Farmer or Admin
export const addTrackingEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { message, location, estimatedDelivery } = req.body;
    const userRole = req.user?.role;

    if (!message) {
      res.status(400).json({ success: false, message: 'Tracking message is required' });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Only farmer who owns the order or admin can add tracking events
    if (userRole !== 'admin' && order.farmer.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    order.trackingEvents.push({
      status: order.status,
      message,
      location: location || '',
      timestamp: new Date(),
    });

    if (estimatedDelivery) {
      order.estimatedDelivery = new Date(estimatedDelivery);
    }

    await order.save();

    // Notify buyer
    if (order.buyer) {
      sendPushNotification(
        order.buyer.toString(),
        'Order Update 📦',
        message
      ).catch(console.error);
    }

    res.status(200).json({
      success: true,
      message: 'Tracking event added',
      trackingEvents: order.trackingEvents,
    });
  } catch (error: any) {
    console.error('Add tracking event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get full tracking timeline for an order
// @route   GET /api/payments/tracking/:orderId
// @access  Private
export const getOrderTracking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('buyer', 'name email')
      .populate('farmer', 'name email')
      .populate('items.product', 'name unit');

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Access control: only the buyer, farmer, or admin can view tracking
    const userId = req.user?._id.toString();
    const userRole = req.user?.role;
    if (
      userRole !== 'admin' &&
      order.buyer.toString() !== userId &&
      order.farmer.toString() !== userId
    ) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    res.status(200).json({
      success: true,
      tracking: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        estimatedDelivery: order.estimatedDelivery,
        createdAt: order.createdAt,
        shippingAddress: order.shippingAddress,
        events: order.trackingEvents.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
        items: order.items,
      },
    });
  } catch (error: any) {
    console.error('Get tracking error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
