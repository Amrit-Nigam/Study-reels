import express from 'express';
import { getAvailableVoices } from '../controllers/voiceController.js';

const router = express.Router();

// Get available voice options
router.get('/available', getAvailableVoices);

export default router;
