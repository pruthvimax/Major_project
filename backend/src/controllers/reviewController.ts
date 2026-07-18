import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review';
import Product from '../models/Product';
import Order from '../models/Order';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Create product review
// @route   POST /api/reviews
// @access  Private/Buyer
export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, rating, comment } = req.body;
    const buyerId = req.user?._id;

    if (!productId || !rating || !comment) {
      res.status(400).json({
        success: false,
        message: 'Please provide product ID, rating and comment',
      });
      return;
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    // Verify if the user bought this product and order status is delivered
    const purchasedOrder = await Order.findOne({
      buyer: buyerId,
      status: 'delivered',
      'items.product': productId,
    });

    if (!purchasedOrder) {
      res.status(403).json({
        success: false,
        message: 'You can only review products you have purchased and had delivered.',
      });
      return;
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ product: productId, buyer: buyerId });
    if (existingReview) {
      res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
      return;
    }

    const review = await Review.create({
      product: productId,
      buyer: buyerId,
      rating: Number(rating),
      comment,
    });

    // Recalculate average rating and review count
    const stats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        averageRating: Math.round(stats[0].averageRating * 10) / 10,
        reviewCount: stats[0].reviewCount,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review,
    });
  } catch (error: any) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('buyer', 'name profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error: any) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
