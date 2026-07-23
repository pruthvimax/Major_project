import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cartController';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(restrictTo('buyer'));

router.get('/', getCart);
router.delete('/', clearCart);
router.post('/items', addToCart);
router.put('/items/:productId', updateCartItem);
router.delete('/items/:productId', removeFromCart);

export default router;
