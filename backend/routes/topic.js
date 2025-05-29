import express from 'express';
import { getTopics, getTopicStats } from '../controllers/topicController.js';

const router = express.Router();

// Get all topics
router.get('/', getTopics);

// Get topic statistics
router.get('/stats', getTopicStats);

export default router;
