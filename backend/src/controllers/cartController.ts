import { Request, Response } from 'express';
import Cart from '../models/Cart';
import Product from '../models/Product';

interface AuthRequest extends Request {
  user?: any;
}

const populateCart = (cartId: any) =>
  Cart.findById(cartId).populate({
    path: 'items.product',
    select: 'name price unit images quantity isAvailable farmer category blockchainId',
    populate: { path: 'farmer', select: 'name email' },
  });

const calcSummary = (items: any[]) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  return {
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    totalAmount: subtotal,
  };
};

// @desc    Get buyer cart
// @route   GET /api/cart
// @access  Private/Buyer
export const getCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let cart = await Cart.findOne({ buyer: req.user?._id });
    if (!cart) {
      cart = await Cart.create({ buyer: req.user?._id, items: [] });
    }

    const populated = await populateCart(cart._id);
    const items = populated?.items || [];

    res.status(200).json({
      success: true,
      cart: populated,
      summary: calcSummary(items),
    });
  } catch (error: any) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add product to cart
// @route   POST /api/cart/items
// @access  Private/Buyer
export const addToCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      res.status(400).json({ success: false, message: 'Product ID is required' });
      return;
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const product = await Product.findById(productId);

    if (!product || !product.isAvailable) {
      res.status(404).json({ success: false, message: 'Product not available' });
      return;
    }

    if (product.quantity < qty) {
      res.status(400).json({
        success: false,
        message: `Only ${product.quantity} ${product.unit} available`,
      });
      return;
    }

    let cart = await Cart.findOne({ buyer: req.user?._id });
    if (!cart) {
      cart = await Cart.create({ buyer: req.user?._id, items: [] });
    }

    const existing = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existing) {
      const newQty = existing.quantity + qty;
      if (newQty > product.quantity) {
        res.status(400).json({
          success: false,
          message: `Cannot exceed available stock (${product.quantity})`,
        });
        return;
      }
      existing.quantity = newQty;
      existing.price = product.price;
    } else {
      cart.items.push({
        product: product._id,
        quantity: qty,
        price: product.price,
        unit: product.unit,
      });
    }

    await cart.save();
    const populated = await populateCart(cart._id);

    res.status(200).json({
      success: true,
      message: 'Added to cart',
      cart: populated,
      summary: calcSummary(populated?.items || []),
    });
  } catch (error: any) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:productId
// @access  Private/Buyer
export const updateCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;
    const qty = Number(quantity);

    if (!qty || qty < 1) {
      res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
      return;
    }

    const cart = await Cart.findOne({ buyer: req.user?._id });
    if (!cart) {
      res.status(404).json({ success: false, message: 'Cart not found' });
      return;
    }

    const item = cart.items.find((i) => i.product.toString() === productId);
    if (!item) {
      res.status(404).json({ success: false, message: 'Item not in cart' });
      return;
    }

    const product = await Product.findById(productId);
    if (!product || !product.isAvailable) {
      res.status(400).json({ success: false, message: 'Product no longer available' });
      return;
    }

    if (qty > product.quantity) {
      res.status(400).json({
        success: false,
        message: `Only ${product.quantity} ${product.unit} available`,
      });
      return;
    }

    item.quantity = qty;
    item.price = product.price;
    await cart.save();

    const populated = await populateCart(cart._id);
    res.status(200).json({
      success: true,
      message: 'Cart updated',
      cart: populated,
      summary: calcSummary(populated?.items || []),
    });
  } catch (error: any) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:productId
// @access  Private/Buyer
export const removeFromCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cart = await Cart.findOne({ buyer: req.user?._id });
    if (!cart) {
      res.status(404).json({ success: false, message: 'Cart not found' });
      return;
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== req.params.productId
    );
    await cart.save();

    const populated = await populateCart(cart._id);
    res.status(200).json({
      success: true,
      message: 'Item removed',
      cart: populated,
      summary: calcSummary(populated?.items || []),
    });
  } catch (error: any) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private/Buyer
export const clearCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cart = await Cart.findOne({ buyer: req.user?._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      cart: cart || { items: [] },
      summary: { itemCount: 0, subtotal: 0, totalAmount: 0 },
    });
  } catch (error: any) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
