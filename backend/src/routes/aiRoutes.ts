import express from 'express';
import { handleChatbotQuery, handleTranscribeAudio } from '../controllers/aiController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Protected AI Chat Query route
router.post('/chat', protect, handleChatbotQuery);

// Voice Audio Transcription route
router.post('/transcribe', handleTranscribeAudio);

export default router;
