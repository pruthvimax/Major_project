import express from 'express';
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getFarmerProducts,
  approveProduct,
  blockProduct,
} from '../controllers/productController';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);

// Protected routes
router.use(protect);

// Farmer specific
router.get('/farmer/my-products', restrictTo('farmer'), getFarmerProducts);
router.post('/', restrictTo('farmer'), createProduct);
router.put('/:id', restrictTo('farmer'), updateProduct);
router.delete('/:id', restrictTo('farmer', 'admin'), deleteProduct);

// Admin moderation
router.put('/:id/approve', restrictTo('admin'), approveProduct);
router.put('/:id/block', restrictTo('admin'), blockProduct);

export default router;