import { Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import Cart from '../models/Cart';
import { createEscrow, releaseEscrow, refundEscrow } from '../services/escrowService';
import { getUserWalletAddress } from '../services/blockchainService';
import { sendPushNotification } from '../services/notificationService';

interface AuthRequest extends Request {
  user?: any;
}

const STATUS_FLOW: Record<string, string[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['packed', 'cancelled'],
  packed: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const TRACKING_MESSAGES: Record<string, string> = {
  accepted: 'Your order has been accepted by the farmer and is being prepared.',
  packed: 'Your order has been packed and is ready for dispatch.',
  shipped: 'Your order has been dispatched and is on its way.',
  delivered: 'Your order has been delivered successfully. Enjoy your fresh produce!',
  cancelled: 'Your order has been cancelled.',
};

const STATUS_TITLES: Record<string, string> = {
  accepted: 'Order Accepted! ✅',
  packed: 'Order Packed! 📦',
  shipped: 'Order Shipped! 🚚',
  delivered: 'Order Delivered! 🎉',
  cancelled: 'Order Cancelled ❌',
};

// @desc    Create order
// @route   POST /api/orders
// @access  Private/Buyer
export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, shippingAddress, paymentMethod, notes, clearCart: shouldClearCart } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Order items are required' });
      return;
    }

    let totalAmount = 0;
    const orderItems = [];
    let farmerId: any = null;
    let farmerEmail = '';
    let firstBlockchainId: number | null = null;
    let firstProductId: string | undefined;

    for (const item of items) {
      const product = await Product.findById(item.productId).populate('farmer', 'email');
      if (!product) {
        res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`,
        });
        return;
      }

      if (!product.isAvailable || product.isBlocked || !product.isApproved) {
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

      const productFarmerId = product.farmer._id
        ? product.farmer._id.toString()
        : product.farmer.toString();

      if (!farmerId) {
        farmerId = product.farmer._id || product.farmer;
        farmerEmail = (product.farmer as any).email || '';
      } else if (farmerId.toString() !== productFarmerId) {
        res.status(400).json({
          success: false,
          message: 'All items in one order must be from the same farmer. Checkout separately per farmer.',
        });
        return;
      }

      if (!firstBlockchainId && product.blockchainId) {
        firstBlockchainId = product.blockchainId;
        firstProductId = product._id.toString();
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        unit: product.unit,
      });

      product.quantity -= item.quantity;
      if (product.quantity === 0) product.isAvailable = false;
      await product.save();
    }

    let blockchainTxHash = '';
    let blockchainOrderId: number | null = null;
    let escrowStatus: any = 'none';
    let buyerWalletAddress = '';
    let farmerWalletAddress = farmerEmail ? getUserWalletAddress(farmerEmail) : '';
    let verificationStatus: any = 'unverified';

    if (paymentMethod === 'blockchain' && firstBlockchainId) {
      const escrow = await createEscrow({
        onChainProductId: firstBlockchainId,
        buyerEmail: req.user?.email || '',
        amount: totalAmount,
        userId: req.user?._id.toString(),
        productId: firstProductId,
      });
      blockchainTxHash = escrow.txHash;
      blockchainOrderId = escrow.blockchainOrderId;
      escrowStatus = escrow.escrowStatus;
      buyerWalletAddress = escrow.buyerWallet;
      if (escrow.txHash) verificationStatus = 'verified';
    }

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

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
      buyerWalletAddress,
      farmerWalletAddress,
      escrowStatus,
      verificationStatus,
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

    if (shouldClearCart) {
      await Cart.findOneAndUpdate({ buyer: req.user?._id }, { items: [] });
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name email mobile')
      .populate('farmer', 'name email mobile')
      .populate('items.product', 'name price unit images');

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

// @desc    Get all orders (Admin)
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get user orders (Buyer)
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get farmer orders
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single order
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'name email mobile address')
      .populate('farmer', 'name email mobile address')
      .populate('items.product', 'name price unit images category');

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    res.status(200).json({ success: true, order });
  } catch (error: any) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update order status (Farmer accept/reject/progress)
export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let { status } = req.body;
    // Backward-compat aliases
    if (status === 'confirmed') status = 'accepted';
    if (status === 'processing') status = 'packed';
    if (status === 'rejected') status = 'cancelled';

    const order = await Order.findById(req.params.id).populate('farmer', 'email');

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const farmerId = (order.farmer as any)._id
      ? (order.farmer as any)._id.toString()
      : order.farmer.toString();
    const isFarmer = farmerId === req.user?._id.toString();
    const isAdmin = req.user?.role === 'admin';

    if (!isFarmer && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to update this order',
      });
      return;
    }

    if (!STATUS_FLOW[order.status]?.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${status}`,
      });
      return;
    }

    // Farmer reject/cancel before accepted — restore stock + refund escrow
    if (status === 'cancelled') {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.quantity += item.quantity;
          product.isAvailable = true;
          await product.save();
        }
      }

      if (order.blockchainOrderId && order.escrowStatus === 'locked') {
        const refund = await refundEscrow({
          blockchainOrderId: order.blockchainOrderId,
          amount: order.totalAmount,
          userId: req.user?._id.toString(),
          orderId: order._id.toString(),
          buyerEmail: undefined,
        });
        if (refund.txHash) {
          order.blockchainTxHash = refund.txHash;
          order.escrowStatus = refund.escrowStatus;
        }
      }
    }

    order.status = status;

    if (status === 'delivered') {
      order.deliveryDate = new Date();
      order.verificationStatus = 'verified';
      if (order.blockchainOrderId && order.escrowStatus === 'locked') {
        const farmerEmail = (order.farmer as any).email || '';
        const release = await releaseEscrow({
          blockchainOrderId: order.blockchainOrderId,
          amount: order.totalAmount,
          userId: req.user?._id.toString(),
          orderId: order._id.toString(),
          farmerEmail,
        });
        if (release.txHash) {
          order.blockchainTxHash = release.txHash;
          order.escrowStatus = release.escrowStatus;
          order.paymentStatus = 'paid';
        }
      } else if (order.paymentMethod !== 'blockchain') {
        order.paymentStatus = 'paid';
      }
    }

    order.trackingEvents.push({
      status,
      message: TRACKING_MESSAGES[status] || `Order status updated to ${status}.`,
      location: req.body.location || '',
      timestamp: new Date(),
    });

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name email mobile')
      .populate('farmer', 'name email mobile')
      .populate('items.product', 'name price unit images');

    if (order.buyer) {
      const title = STATUS_TITLES[status] || 'Order Status Update';
      sendPushNotification(
        order.buyer.toString(),
        title,
        `Your order ${order.orderNumber} is now ${status}.`
      ).catch((err) => console.error('Error sending buyer status notification:', err));
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Cancel order (buyer before confirmation / admin)
export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id).populate('buyer', 'email');

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const buyerId = (order.buyer as any)._id
      ? (order.buyer as any)._id.toString()
      : order.buyer.toString();
    const isBuyer = buyerId === req.user?._id.toString();
    const isAdmin = req.user?.role === 'admin';

    if (!isBuyer && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this order',
      });
      return;
    }

    // Buyer can cancel only before farmer accepts
    if (isBuyer && !isAdmin && order.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'You can only cancel orders before farmer confirmation',
      });
      return;
    }

    if (order.status === 'shipped' || order.status === 'delivered' || order.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`,
      });
      return;
    }

    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.quantity += item.quantity;
        product.isAvailable = true;
        await product.save();
      }
    }

    order.status = 'cancelled';

    if (order.blockchainOrderId && order.escrowStatus === 'locked') {
      const buyerEmail = (order.buyer as any).email || req.user?.email || '';
      const refund = await refundEscrow({
        blockchainOrderId: order.blockchainOrderId,
        amount: order.totalAmount,
        userId: req.user?._id.toString(),
        orderId: order._id.toString(),
        buyerEmail,
      });
      if (refund.txHash) {
        order.blockchainTxHash = refund.txHash;
        order.escrowStatus = refund.escrowStatus;
      }
    }

    order.trackingEvents.push({
      status: 'cancelled',
      message: req.body.reason || 'Order cancelled.',
      location: '',
      timestamp: new Date(),
    });

    await order.save();

    if (order.farmer && order.buyer) {
      const cancellerRole = req.user?.role === 'admin' ? 'Administrator' : 'Buyer';
      sendPushNotification(
        order.farmer.toString(),
        'Order Cancelled ❌',
        `Order ${order.orderNumber} has been cancelled by the ${cancellerRole.toLowerCase()}.`
      ).catch((err) => console.error('Error sending cancellation notification to farmer:', err));

      sendPushNotification(
        buyerId,
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update payment status
export const updatePaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentStatus, blockchainTxHash } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const isBuyer = order.buyer.toString() === req.user?._id.toString();
    const isAdmin = req.user?.role === 'admin';

    if (!isBuyer && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to update payment status',
      });
      return;
    }

    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (blockchainTxHash) order.blockchainTxHash = blockchainTxHash;

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      order,
    });
  } catch (error: any) {
    console.error('Update payment status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Resolve dispute (Admin)
export const resolveDispute = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { resolution, status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    order.verificationStatus = 'resolved';
    order.disputeReason = resolution || order.disputeReason;
    if (status && STATUS_FLOW[order.status]?.includes(status)) {
      order.status = status;
    }

    order.trackingEvents.push({
      status: 'resolved',
      message: resolution || 'Dispute resolved by administrator.',
      location: '',
      timestamp: new Date(),
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Dispute resolved',
      order,
    });
  } catch (error: any) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Flag dispute
export const flagDispute = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    order.verificationStatus = 'disputed';
    order.disputeReason = reason || 'Dispute raised';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Dispute flagged',
      order,
    });
  } catch (error: any) {
    console.error('Flag dispute error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
