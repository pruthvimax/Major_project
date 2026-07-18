import { Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import { purchaseProductOnChain, confirmDeliveryOnChain, cancelOrderOnChain } from '../services/blockchainService';
import { sendPushNotification } from '../services/notificationService';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Create order
// @route   POST /api/orders
// @access  Private/Buyer
export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItems = [];
    let farmerId: any = null;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`,
        });
        return;
      }

      if (!product.isAvailable) {
        res.status(400).json({
          success: false,
          message: `Product ${product.name} is not available`,
        });
        return;
      }

      if (product.quantity < item.quantity) {
        res.status(400).json({
          success: false,
          message: `Not enough quantity for ${product.name}`,
        });
        return;
      }

      if (!farmerId) {
        farmerId = product.farmer;
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        unit: product.unit,
      });

      // Reduce product quantity
      product.quantity -= item.quantity;
      await product.save();
    }

    // Process on-chain payment if paymentMethod is blockchain
    let blockchainTxHash = '';
    let blockchainOrderId = null;

    if (paymentMethod === 'blockchain' && orderItems.length > 0) {
      const firstProduct = await Product.findById(orderItems[0].product);
      if (firstProduct && firstProduct.blockchainId) {
        const purchaseResult = await purchaseProductOnChain(
          firstProduct.blockchainId,
          req.user?.email || '',
          totalAmount
        );
        blockchainTxHash = purchaseResult.txHash;
        blockchainOrderId = purchaseResult.blockchainOrderId;
      }
    }

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5); // Default: 5 days

    const order = await Order.create({
      buyer: req.user?._id,
      farmer: farmerId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      notes,
      blockchainTxHash,
      blockchainOrderId,
      estimatedDelivery,
      trackingEvents: [
        {
          status: 'pending',
          message: 'Order placed successfully. Waiting for farmer confirmation.',
          location: '',
          timestamp: new Date(),
        },
      ],
    });

    // Populate order details
    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name email mobile')
      .populate('farmer', 'name email mobile')
      .populate('items.product', 'name price unit images');

    // Trigger Push Notification to Farmer
    if (order.farmer) {
      sendPushNotification(
        order.farmer.toString(),
        'New Order Received 🌾',
        `A buyer has placed a new order (${order.orderNumber}) for a total of ₹${order.totalAmount}.`
      ).catch((err) => console.error('Error sending farmer notification:', err));
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: populatedOrder,
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all orders (Admin) - Fixed unused req parameter
export const getOrders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find()
      .populate('buyer', 'name email mobile')
      .populate('farmer', 'name email mobile')
      .populate('items.product', 'name price unit images')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error: any) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get user orders (Buyer)
// @route   GET /api/orders/buyer
// @access  Private/Buyer
export const getBuyerOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ buyer: req.user?._id })
      .populate('buyer', 'name email mobile')
      .populate('farmer', 'name email mobile')
      .populate('items.product', 'name price unit images')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error: any) {
    console.error('Get buyer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get farmer orders
// @route   GET /api/orders/farmer
// @access  Private/Farmer
export const getFarmerOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ farmer: req.user?._id })
      .populate('buyer', 'name email mobile')
      .populate('farmer', 'name email mobile')
      .populate('items.product', 'name price unit images')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error: any) {
    console.error('Get farmer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'name email mobile address')
      .populate('farmer', 'name email mobile address')
      .populate('items.product', 'name price unit images category');

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Farmer or Admin
export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Check authorization
    const isFarmer = order.farmer.toString() === req.user?._id.toString();
    const isAdmin = req.user?.role === 'admin';

    if (!isFarmer && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to update this order',
      });
      return;
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${status}`,
      });
      return;
    }

    order.status = status;
    if (status === 'delivered') {
      order.deliveryDate = new Date();
      if (order.blockchainOrderId) {
        const txHash = await confirmDeliveryOnChain(order.blockchainOrderId);
        if (txHash) {
          order.blockchainTxHash = txHash;
          order.paymentStatus = 'paid';
        }
      }
    }

    // Auto-append a tracking event for each status transition
    const trackingMessages: Record<string, string> = {
      confirmed: 'Your order has been confirmed by the farmer and is being prepared.',
      processing: 'Your order is being packed and prepared for dispatch.',
      shipped: 'Your order has been dispatched and is on its way.',
      delivered: 'Your order has been delivered successfully. Enjoy your fresh produce!',
      cancelled: 'Your order has been cancelled.',
    };
    order.trackingEvents.push({
      status,
      message: trackingMessages[status] || `Order status updated to ${status}.`,
      location: req.body.location || '',
      timestamp: new Date(),
    });

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name email mobile')
      .populate('farmer', 'name email mobile')
      .populate('items.product', 'name price unit images');

    // Trigger Push Notification to Buyer
    if (order.buyer) {
      const statusTitle: Record<string, string> = {
        confirmed: 'Order Confirmed! ✅',
        processing: 'Order Processing! ⚙️',
        shipped: 'Order Shipped! 🚚',
        delivered: 'Order Delivered! 🎉',
        cancelled: 'Order Cancelled ❌',
      };
      const title = statusTitle[status] || 'Order Status Update';
      const body = `Your order ${order.orderNumber} is now ${status}.`;

      sendPushNotification(order.buyer.toString(), title, body).catch((err) =>
        console.error('Error sending buyer status notification:', err)
      );
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Only buyer or admin can cancel
    const isBuyer = order.buyer.toString() === req.user?._id.toString();
    const isAdmin = req.user?.role === 'admin';

    if (!isBuyer && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this order',
      });
      return;
    }

    // Can only cancel pending or confirmed orders
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`,
      });
      return;
    }

    // Restore product quantities
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }
    }

    order.status = 'cancelled';
    if (order.blockchainOrderId) {
      const txHash = await cancelOrderOnChain(order.blockchainOrderId);
      if (txHash) {
        order.blockchainTxHash = txHash;
      }
    }
    await order.save();

    // Trigger Push Notifications on Cancel
    if (order.farmer && order.buyer) {
      const cancellerRole = req.user?.role === 'admin' ? 'Administrator' : 'Buyer';
      
      // Notify Farmer
      sendPushNotification(
        order.farmer.toString(),
        'Order Cancelled ❌',
        `Order ${order.orderNumber} has been cancelled by the ${cancellerRole.toLowerCase()}.`
      ).catch((err) => console.error('Error sending cancellation notification to farmer:', err));

      // Notify Buyer
      sendPushNotification(
        order.buyer.toString(),
        'Order Cancelled ❌',
        `Your order ${order.orderNumber} has been successfully cancelled.`
      ).catch((err) => console.error('Error sending cancellation notification to buyer:', err));
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order,
    });
  } catch (error: any) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update payment status
// @route   PUT /api/orders/:id/payment
// @access  Private
export const updatePaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentStatus, blockchainTxHash } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found',
      });
      return;
    }

    // Check authorization
    const isBuyer = order.buyer.toString() === req.user?._id.toString();
    const isAdmin = req.user?.role === 'admin';

    if (!isBuyer && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to update payment status',
      });
      return;
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }
    if (blockchainTxHash) {
      order.blockchainTxHash = blockchainTxHash;
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      order,
    });
  } catch (error: any) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};