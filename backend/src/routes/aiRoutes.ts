import express from 'express';
import { handleChatbotQuery } from '../controllers/aiController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Protected AI Chat Query route
router.post('/chat', protect, handleChatbotQuery);

export default router;
