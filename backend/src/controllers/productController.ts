import { Request, Response } from 'express';
import Product from '../models/Product';
import { listProductOnChain, getUserWalletAddress } from '../services/blockchainService';
import { recordTransaction } from '../services/transactionService';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Create product
// @route   POST /api/products
// @access  Private/Farmer
export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      category,
      price,
      quantity,
      unit,
      images,
      location,
      isOrganic,
    } = req.body;

    const farmerWallet = getUserWalletAddress(req.user?.email || '');
    const blockchainResult = await listProductOnChain(req.user?.email || '', name, price);
    const blockchainTxHash = blockchainResult.txHash;
    const blockchainId = blockchainResult.blockchainId;

    const product = await Product.create({
      name,
      description,
      category,
      price,
      quantity,
      unit,
      images: images || [],
      farmer: req.user?._id,
      location,
      isOrganic: isOrganic || false,
      blockchainTxHash,
      blockchainId,
      farmerWalletAddress: farmerWallet,
      verificationStatus: blockchainTxHash ? 'verified' : 'unverified',
      isApproved: true,
      isBlocked: false,
    });

    if (blockchainTxHash) {
      await recordTransaction({
        txHash: blockchainTxHash,
        from: farmerWallet,
        to: 'marketplace',
        amount: price,
        type: 'product_listing',
        userId: req.user?._id,
        productId: product._id,
        status: 'confirmed',
        metadata: { blockchainId, name },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, farmer, search, minPrice, maxPrice, organic } = req.query;
    
    const filter: any = { isAvailable: true, isBlocked: false, isApproved: true };

    // Admin can request all products via ?all=true
    if (req.query.all === 'true') {
      delete filter.isAvailable;
      delete filter.isBlocked;
      delete filter.isApproved;
    }

    if (category) filter.category = category;
    if (farmer) filter.farmer = farmer;
    if (organic === 'true') filter.isOrganic = true;
    if (minPrice) filter.price = { ...filter.price, $gte: Number(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };

    let query = Product.find(filter).populate('farmer', 'name email mobile address');

    if (search) {
      query = query.find({ $text: { $search: search as string } });
    }

    const products = await query.sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id).populate('farmer', 'name email mobile address');

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error: any) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Farmer
export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    // Check if user is the owner
    if (product.farmer.toString() !== req.user?._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to update this product',
      });
      return;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error: any) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Farmer or Admin
export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    // Check if user is owner or admin
    const isOwner = product.farmer.toString() === req.user?._id.toString();
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this product',
      });
      return;
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get farmer's products
// @route   GET /api/products/farmer
// @access  Private/Farmer
export const getFarmerProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const products = await Product.find({ farmer: req.user?._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    console.error('Get farmer products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Admin approve product
// @route   PUT /api/products/:id/approve
// @access  Private/Admin
export const approveProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, isBlocked: false, verificationStatus: 'verified' },
      { new: true }
    );

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Product approved', product });
  } catch (error: any) {
    console.error('Approve product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Admin block product
// @route   PUT /api/products/:id/block
// @access  Private/Admin
export const blockProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true, isAvailable: false, verificationStatus: 'rejected' },
      { new: true }
    );

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Product blocked', product });
  } catch (error: any) {
    console.error('Block product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};