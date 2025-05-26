// Main server file
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import videoRoutes from './routes/video.js';
import voiceRoutes from './routes/voice.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'http://localhost:5173'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use('/temp', express.static(join(__dirname, 'temp')));

// Routes
app.use('/api/video', videoRoutes);
app.use('/api/voice', voiceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
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
app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log available API keys for debugging
  console.log('Available APIs:');
  console.log(`- Gemini API: ${process.env.GEMINI_API_KEY ? 'Available' : 'Not configured'}`);
  console.log(`- ElevenLabs API: ${process.env.ELEVENLABS_API_KEY ? 'Available' : 'Not configured'}`);
  console.log(`- FAL.ai API: ${process.env.FAL_KEY ? 'Available' : 'Not configured'}`);
});
