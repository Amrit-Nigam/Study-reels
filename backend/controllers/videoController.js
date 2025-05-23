import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import fluent-ffmpeg utilities
import { createFfmpeg, verifyMediaFile, addAudioToVideo, addSubtitlesToVideo } from '../utils/ffmpegUtils.js';

/**
 * Verify media file is valid using fluent-ffmpeg
 * @param {string} filePath - Path to the media file
 * @returns {Promise<boolean>} - Whether the file is valid
 */
async function checkMediaFile(filePath) {
  try {
    console.log(`Verifying media file: ${filePath}`);
    return await verifyMediaFile(filePath);
  } catch (error) {
    console.error(`Error verifying media file ${filePath}:`, error.message);
    return false;
  }
}

export const generateVideo = async (req, res) => {
  try {
    const { audioPath, dialogue } = req.body;
    const gameplayVideo = req.file;
    
    if (!audioPath || !gameplayVideo) {
      return res.status(400).json({ 
        error: 'Missing required parameters. audioPath and gameplayVideo are required.' 
      });
    }
    
    // Define file paths
    const uploadsDir = path.join(__dirname, '../uploads');
    const gameplayPath = gameplayVideo.path;
    const audioFilePath = path.join(uploadsDir, audioPath);
    
    // Generate SRT subtitle path from audioPath 
    // (assumes audioPath is like merged_audio_TIMESTAMP.mp3)
    const timestamp = audioPath.match(/\d+/)[0];
    const subtitlePath = path.join(uploadsDir, `dialogue_${timestamp}.srt`);
    
    // Check if files exist
    if (!fs.existsSync(gameplayPath)) {
      return res.status(400).json({ error: 'Gameplay video file not found' });
    }
    if (!fs.existsSync(audioFilePath)) {
      return res.status(400).json({ error: 'Audio file not found' });
    }
    
    // Subtitle file is optional - we'll mention this if it's not found but continue anyway
    const hasSubtitles = fs.existsSync(subtitlePath);
    if (!hasSubtitles) {
      console.log('Subtitle file not found, proceeding without subtitles');
    }
    
    // Verify the input files are valid media files
    const videoValid = await verifyMediaFile(gameplayPath);
    if (!videoValid) {
      return res.status(400).json({ error: 'Gameplay video file is corrupted or invalid' });
    }
    
    const audioValid = await verifyMediaFile(audioFilePath);
    if (!audioValid) {
      return res.status(400).json({ error: 'Audio file is corrupted or invalid' });
    }
    
    // Create output filename
    const outputFilename = `final_video_${Date.now()}.mp4`;
    const outputPath = path.join(uploadsDir, outputFilename);
    
    console.log('=== VIDEO GENERATION STARTING ===');
    console.log(`Generating final video: ${outputPath}`);
    console.log(`- Gameplay video: ${gameplayPath}`);
    console.log(`- Audio file: ${audioFilePath}`);
    if (hasSubtitles) {
      console.log(`- Subtitle file: ${subtitlePath}`);
    }
      // Use our fluent-ffmpeg utility instead of direct command
    console.log('Adding audio to video using fluent-ffmpeg');
      try {
      // Use our addAudioToVideo helper instead of exec
      await addAudioToVideo(gameplayPath, audioFilePath, outputPath);
      
      console.log('Video processing completed');
      
      // Check if output file exists and has content
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log(`Video generated successfully: ${outputPath}`);
        console.log('=== VIDEO GENERATION COMPLETE ===');
        
        return res.status(200).json({
          success: true,
          videoPath: outputFilename,
          videoUrl: `/uploads/${outputFilename}`,
          message: 'Video generated successfully'
        });
      } else {
        console.error('Output file is missing or empty');
        throw new Error('Output file is missing or empty after video processing');
      }
    } catch (execError) {
      console.error('Video processing error:', execError.message);
      
      if (execError.stderr) {
        console.error('FFmpeg stderr:', execError.stderr);
      }
      
      // Try a more compatible FFmpeg command with less options
      console.log('Attempting video generation with simpler command...');
        try {
        // Create a new ffmpeg command with simpler options
        console.log('Trying alternative video processing approach');
        
        // Use a simpler version of addAudioToVideo with basic options
        const simpleOptions = { useSimpleOptions: true };
        await addAudioToVideo(gameplayPath, audioFilePath, outputPath, simpleOptions);
        
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          console.log('Video generation completed with fallback command');
          console.log('=== VIDEO GENERATION COMPLETE ===');
          
          return res.status(200).json({
            success: true,
            videoPath: outputFilename,
            videoUrl: `/uploads/${outputFilename}`,
            message: 'Video generated successfully with fallback method'
          });
        } else {
          throw new Error('Fallback video generation failed');
        }
      } catch (fallbackError) {
        console.error('Fallback FFmpeg execution error:', fallbackError.message);
        throw new Error(`All FFmpeg methods failed: ${execError.message}`);
      }
    }
  } catch (error) {
    console.error('Error in video generation:', error);
    return res.status(500).json({ 
      error: 'Failed to generate video', 
      details: error.message 
    });
  }
};
