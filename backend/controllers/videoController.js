import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    if (!fs.existsSync(subtitlePath)) {
      return res.status(400).json({ error: 'Subtitle file not found' });
    }
    
    // Create output filename
    const outputFilename = `final_video_${Date.now()}.mp4`;
    const outputPath = path.join(uploadsDir, outputFilename);
    
    console.log(`Generating final video: ${outputPath}`);
    console.log(`- Gameplay video: ${gameplayPath}`);
    console.log(`- Audio file: ${audioFilePath}`);
    console.log(`- Subtitle file: ${subtitlePath}`);
    
    // For MVP, we'll create a simpler version without subtitle burning
    // This is to avoid potential ffmpeg configuration issues
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(gameplayPath)
        .input(audioFilePath)
        // Map the video from first input
        .outputOptions(['-map 0:v'])
        // Map the audio from second input
        .outputOptions(['-map 1:a'])
        // Use the shortest input to determine output length
        .outputOptions(['-shortest'])
        .save(outputPath)
        .on('end', () => {
          console.log('Video generation completed');
          resolve(res.status(200).json({
            success: true,
            videoPath: outputFilename,
            videoUrl: `/uploads/${outputFilename}`,
            message: 'Video generated successfully'
          }));
        })
        .on('error', (err) => {
          console.error('Error generating video:', err);
          reject(res.status(500).json({ 
            error: 'Failed to generate video', 
            details: err.message 
          }));
        });
    });
    
    /* Full implementation with subtitle burning:
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(gameplayPath)
        .input(audioFilePath)
        .complexFilter([
          // Add subtitles
          {
            filter: 'subtitles',
            options: { filename: subtitlePath },
            inputs: '0:v',
            outputs: 'v1'
          }
        ])
        .outputOptions([
          '-map v1',        // Use the video with subtitles
          '-map 1:a',       // Use the audio from the second input
          '-shortest'       // Use the shortest input to determine output length
        ])
        .save(outputPath)
        .on('end', () => {
          console.log('Video generation completed');
          resolve(res.status(200).json({
            success: true,
            videoPath: outputFilename,
            videoUrl: `/uploads/${outputFilename}`,
            message: 'Video generated successfully'
          }));
        })
        .on('error', (err) => {
          console.error('Error generating video:', err);
          reject(res.status(500).json({ 
            error: 'Failed to generate video', 
            details: err.message 
          }));
        });
    });
    */
    
  } catch (error) {
    console.error('Error in video generation:', error);
    return res.status(500).json({ 
      error: 'Failed to generate video', 
      details: error.message 
    });
  }
};
