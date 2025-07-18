// Main server file
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import videoRoutes from './routes/video.js';
import voiceRoutes from './routes/voice.js';
import topicRoutes from './routes/topic.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/brainrot';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.warn('Application will continue without MongoDB functionality');
    console.warn('Topics will not be saved to a database');
  });

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create temp directory if it doesn't exist
const tempDir = join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Middleware
app.use(cors()); // Simple CORS setup - allow all origins
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use('/temp', express.static(join(__dirname, 'temp')));

// Routes
app.use('/api/video', videoRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/topics', topicRoutes);

// Fallback route for script generation (in case the main route fails)
app.post('/api/fallback/generate-script', (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    
    // Generate a simple fallback dialogue
    const fallbackDialogue = [
      { "speaker": "Nina", "text": `Let's talk about ${topic}. It's a fascinating subject!` },
      { "speaker": "Jay", "text": "I'd love to learn more about it." },
      { "speaker": "Nina", "text": "What specific aspects are you interested in?" },
      { "speaker": "Jay", "text": "Maybe you could start with the basics?" },
      { "speaker": "Nina", "text": `Sure! The key things to understand about ${topic} are...` }
    ];
    
    return res.status(200).json({ 
      success: true, 
      dialogue: fallbackDialogue,
      message: 'Fallback script generated' 
    });
  } catch (error) {
    console.error('Error in fallback route:', error);
    return res.status(500).json({ error: 'Failed to generate fallback script' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'API is running'
  });
});

// System check endpoint for troubleshooting
app.get('/api/system-check', async (req, res) => {
  try {
    const { checkFFmpegInstallation } = await import('./utils/systemCheck.js');
    const results = await checkFFmpegInstallation();
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check system', details: error.message });
  }
});

// Detailed report endpoint
app.get('/api/system-report', async (req, res) => {
  try {
    const { generateFFmpegReport } = await import('./utils/systemCheck.js');
    const report = await generateFFmpegReport();
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
});

// Start server
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(PORT, HOST, async () => {
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log available API keys for debugging
  console.log('Available APIs:');
  console.log(`- Gemini API: ${process.env.GEMINI_API_KEY ? 'Available' : 'Not configured'}`);
  console.log(`- ElevenLabs API: ${process.env.ELEVENLABS_API_KEY ? 'Available' : 'Not configured'}`);
  console.log(`- FAL.ai API: ${process.env.FAL_KEY ? 'Available' : 'Not configured'}`);
  
  // Schedule periodic cleanup of old temp files
  try {
    // Import the cleanup utility
    const { cleanupOldTempFiles } = await import('./utils/cleanupUtils.js');
    
    // Run cleanup on server start
    const initialCleanup = await cleanupOldTempFiles();
    console.log('Initial cleanup result:', initialCleanup);
    
    // Schedule cleanup to run every 6 hours
    const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    setInterval(async () => {
      try {
        const result = await cleanupOldTempFiles();
        console.log(`Scheduled cleanup result:`, result);
      } catch (error) {
        console.error('Error in scheduled cleanup:', error);
      }
    }, CLEANUP_INTERVAL);
    
    console.log(`Automated cleanup scheduled to run every 6 hours`);
  } catch (error) {
    console.error('Failed to set up automated cleanup:', error);
  }
});
