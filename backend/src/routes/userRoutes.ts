import express from 'express';
import {
  getUsers,
  getUser,
  updateProfile,
  getFarmers,
  getBuyers,
  deleteUser,
  updatePushToken,
} from '../controllers/userController';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

router.use(protect); // All routes require authentication

router.get('/', restrictTo('admin'), getUsers);
router.get('/farmers', getFarmers);
router.get('/buyers', restrictTo('admin'), getBuyers);
router.get('/profile', getUser);
router.put('/profile', updateProfile);
router.put('/push-token', updatePushToken);
router.get('/:id', getUser);
router.delete('/:id', restrictTo('admin'), deleteUser);

export default router;