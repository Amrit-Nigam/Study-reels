import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the FFmpeg executable path
 * @returns {string} Path to ffmpeg executable
 */
function getFFmpegPath() {
  // Check if ffmpeg exists locally in the backend directory
  const localFFmpeg = path.join(__dirname, '../ffmpeg.exe');
  if (fs.existsSync(localFFmpeg)) {
    console.log('Using local FFmpeg executable from backend directory');
    return localFFmpeg;
  }
  
  // Fallback to system PATH
  return 'ffmpeg';
}

/**
 * Verify media file is valid using FFprobe
 * @param {string} filePath - Path to the media file
 * @returns {Promise<boolean>} - Whether the file is valid
 */
async function verifyMediaFile(filePath) {
  try {
    const ffprobePath = path.join(__dirname, '../ffprobe.exe');
    const command = fs.existsSync(ffprobePath) 
      ? `"${ffprobePath}" -v error -i "${filePath}" -show_entries format=duration -of default=noprint_wrappers=1:nokey=1`
      : `ffprobe -v error -i "${filePath}" -show_entries format=duration -of default=noprint_wrappers=1:nokey=1`;
    
    console.log(`Verifying media file: ${filePath}`);
    const { stdout, stderr } = await exec(command);
    
    const duration = parseFloat(stdout.trim());
    console.log(`File duration: ${duration} seconds`);
    return !isNaN(duration) && duration > 0;
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
    
    // Get FFmpeg path
    const ffmpegPath = getFFmpegPath();
      // Construct the FFmpeg command based on whether we have subtitles
    let ffmpegCmd;
      // Simple command that is known to work reliably - just copy video stream and add audio
    // We're not dealing with subtitles for now to avoid FFmpeg subtitle filter issues
    ffmpegCmd = `"${ffmpegPath}" -i "${gameplayPath}" -i "${audioFilePath}" -map 0:v -map 1:a -c:v copy -c:a aac -shortest "${outputPath}" -y`;
    
    console.log(`Running FFmpeg command: ${ffmpegCmd}`);
    
    try {
      // Execute the command
      const { stdout, stderr } = await exec(ffmpegCmd);
      
      console.log('FFmpeg process completed');
      if (stderr) {
        // FFmpeg outputs progress info to stderr, so this is not necessarily an error
        console.log('FFmpeg stderr output:', stderr);
      }
      
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
        throw new Error('Output file is missing or empty after FFmpeg process completed');
      }
    } catch (execError) {
      console.error('FFmpeg execution error:', execError.message);
      
      if (execError.stderr) {
        console.error('FFmpeg stderr:', execError.stderr);
      }
      
      // Try a more compatible FFmpeg command with less options
      console.log('Attempting video generation with simpler command...');
      
      try {
        // More compatible fallback command
        const fallbackCmd = `"${ffmpegPath}" -i "${gameplayPath}" -i "${audioFilePath}" -c:v copy -c:a aac "${outputPath}" -y`;
        console.log(`Running fallback FFmpeg command: ${fallbackCmd}`);
        
        const { stdout: fallbackStdout, stderr: fallbackStderr } = await exec(fallbackCmd);
        
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
