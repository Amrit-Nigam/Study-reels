import express from 'express';
import { generateScript } from '../controllers/scriptController.js';
import { generateAudio } from '../controllers/audioController.js';
import { generateVideo } from '../controllers/videoController.js';
import { cleanupSession } from '../controllers/cleanupController.js';
import multer from 'multer';
import { join } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

const router = express.Router();

// Generate script from a topic
router.post('/generate-script', generateScript);

// Generate audio from a script
router.post('/generate-audio', (req, res) => {
  // Add a session ID if not provided
  if (!req.body.sessionId) {
    req.body.sessionId = `session-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    console.log(`Adding session ID for direct audio generation: ${req.body.sessionId}`);
  }
  
  // Call the audio controller
  generateAudio(req, res);
});

// Generate final video (requires a gameplay video upload)
router.post('/generate-video', upload.single('gameplayVideo'), (req, res) => {
  // Add a session ID if not provided
  if (!req.body.sessionId) {
    req.body.sessionId = `session-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    console.log(`Adding session ID for direct video generation: ${req.body.sessionId}`);
  }
  
  // Call the video controller
  generateVideo(req, res);
});

// All-in-one endpoint to generate a complete video
router.post('/create', upload.single('gameplayVideo'), async (req, res) => {
  try {    // Generate a unique session ID for this request
    const sessionId = `session-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    console.log(`Creating new video with session ID: ${sessionId}`);
    
    // 1. First generate the script
    const scriptReq = { 
      body: {
        topic: req.body.topic,
        sessionId: sessionId
      }
    };
    const scriptRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.data = data;
        return this;
      }
    };
    
    await generateScript(scriptReq, scriptRes);
    
    if (scriptRes.statusCode !== 200) {
      return res.status(scriptRes.statusCode).json(scriptRes.data);
    }
      // 2. Generate audio from the script
    const audioReq = {
      body: {
        dialogue: scriptRes.data.dialogue,
        voice1: req.body.voice1,
        voice2: req.body.voice2,
        sessionId: sessionId
      }
    };
    
    const audioRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.data = data;
        return this;
      }
    };
    
    await generateAudio(audioReq, audioRes);
    
    if (audioRes.statusCode !== 200) {
      return res.status(audioRes.statusCode).json(audioRes.data);
    }
      // 3. Generate the final video
    const videoReq = {
      body: {
        audioPath: audioRes.data.audioPath,
        dialogue: scriptRes.data.dialogue,
        sessionId: sessionId
      },
      file: req.file
    };
    
    const videoRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.data = data;
        return this;
      }
    };
      await generateVideo(videoReq, videoRes);
    
    return res.status(videoRes.statusCode).json(videoRes.data);
    
  } catch (error) {
    console.error('Error in create endpoint:', error);
    return res.status(500).json({ error: 'Failed to create video', details: error.message });
  }
});

// Cleanup temporary files for a session
router.post('/cleanup', cleanupSession);

export default router;
