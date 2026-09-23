import express from 'express';
import {
  getSchemes,
  getSchemeById,
  createScheme,
  updateScheme,
  deleteScheme,
  toggleSaveScheme,
  getSchemeAnalytics,
  createSchemeQuery,
  getMySchemeQueries,
  getAllSchemeQueries,
  respondToSchemeQuery,
} from '../controllers/schemeController';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

// Every scheme route requires a signed-in user.
router.use(protect);

// ---- Admin-only, static paths (must be declared before `/:id`) ----
router.get('/analytics', restrictTo('admin'), getSchemeAnalytics);
router.get('/queries', restrictTo('admin'), getAllSchemeQueries);
router.put('/queries/:queryId', restrictTo('admin'), respondToSchemeQuery);

// ---- Farmer query inbox ----
router.get('/queries/mine', restrictTo('farmer'), getMySchemeQueries);

// ---- Scheme catalogue ----
router.get('/', getSchemes);
router.post('/', restrictTo('admin'), createScheme);

router.get('/:id', getSchemeById);
router.put('/:id', restrictTo('admin'), updateScheme);
router.delete('/:id', restrictTo('admin'), deleteScheme);

// ---- Farmer actions on a scheme ----
router.post('/:id/save', restrictTo('farmer'), toggleSaveScheme);
router.post('/:id/queries', restrictTo('farmer'), createSchemeQuery);

export default router;
