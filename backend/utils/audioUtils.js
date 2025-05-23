import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

/**
 * Utility function to get the FFmpeg command path
 * @returns {string} Path to ffmpeg executable
 */
export function getFFmpegPath(baseDir) {
  // Check if ffmpeg exists locally in the backend directory
  const localFFmpeg = path.join(baseDir, 'ffmpeg.exe');
  if (fs.existsSync(localFFmpeg)) {
    console.log('Using local FFmpeg executable from backend directory');
    return `"${localFFmpeg}"`;
  }
  
  // Fallback to system PATH
  return 'ffmpeg';
}

/**
 * Utility function to get the FFprobe command path
 * @returns {string} Path to ffprobe executable
 */
export function getFFprobePath(baseDir) {
  // Check if ffprobe exists locally in the backend directory
  const localFFprobe = path.join(baseDir, 'ffprobe.exe');
  if (fs.existsSync(localFFprobe)) {
    console.log('Using local FFprobe executable from backend directory');
    return `"${localFFprobe}"`;
  }
  
  // Fallback to system PATH
  return 'ffprobe';
}

/**
 * Concatenate multiple audio files into a single file
 * @param {Array} audioFiles - Array of audio file objects with path properties
 * @param {string} outputPath - Path where the merged audio should be saved
 * @param {string} tempDir - Directory for storing temporary files
 * @param {string} baseDir - Base directory of the application
 * @returns {Promise<void>}
 */
export async function concatenateAudioFiles(audioFiles, outputPath, tempDir, baseDir) {
  // Check if we have any files to concatenate
  if (audioFiles.length === 0) {
    throw new Error('No audio files were provided for concatenation');
  }

  // Get ffmpeg command
  const ffmpegCmd = getFFmpegPath(baseDir);
  console.log('Concatenating audio files...');
  console.log(`Number of audio files to concatenate: ${audioFiles.length}`);
  
  // Handle single file case
  if (audioFiles.length === 1) {
    console.log(`Only one audio file, copying to output: ${audioFiles[0].path}`);
    fs.copyFileSync(audioFiles[0].path, outputPath);
    console.log('Audio file copied successfully');
    return;
  }
  
  // For multiple files, normalize and concatenate
  // First convert all files to a consistent WAV format
  const normalizedFiles = [];
  const timestamp = Date.now();
  
  try {
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      const normalizedPath = path.join(tempDir, `norm_${i}_${timestamp}.wav`);
        try {
        // Convert each file to a consistent WAV format
        console.log(`Converting ${file.path} to consistent WAV format...`);
        // Check if input file exists and is readable
        if (!fs.existsSync(file.path)) {
          console.error(`Input file does not exist: ${file.path}`);
          continue;
        }
        
        // Try with more verbose output for debugging
        const command = `${ffmpegCmd} -i "${file.path}" -acodec pcm_s16le -ac 1 -ar 44100 "${normalizedPath}" -y`;
        console.log(`Executing command: ${command}`);
        
        try {
          const { stdout, stderr } = await exec(command);
          console.log(`FFmpeg stdout: ${stdout}`);
          if (stderr) {
            console.log(`FFmpeg stderr: ${stderr}`);
          }
          
          // Verify if output file was created
          if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).size > 0) {
            console.log(`Successfully normalized to: ${normalizedPath}`);
            normalizedFiles.push(normalizedPath);
          } else {
            console.error(`Failed to create normalized file: ${normalizedPath}`);
          }
        } catch (execError) {
          console.error(`FFmpeg execution error: ${execError.message}`);
          console.error(`stderr: ${execError.stderr || 'None'}`);
          console.error(`stdout: ${execError.stdout || 'None'}`);
          // If we can't normalize, use the original file as-is
          console.log(`Using original file instead: ${file.path}`);
          normalizedFiles.push(file.path);
        }
      } catch (error) {
        console.error(`Error normalizing file ${file.path}: ${error.message}`);
        // Use the original file if conversion fails
        console.log(`Using original file instead: ${file.path}`);
        normalizedFiles.push(file.path);
      }
    }
      // Check if we have any normalized files
    if (normalizedFiles.length === 0) {
      throw new Error('No audio files were successfully normalized for concatenation');
    }
    
    if (normalizedFiles.length === 1) {
      console.log(`Only one normalized audio file, copying directly: ${normalizedFiles[0]}`);
      fs.copyFileSync(normalizedFiles[0], outputPath);
      console.log(`File copied to ${outputPath}`);
      return;
    }
    
    // Create file list for concatenation
    const fileListPath = path.join(tempDir, `filelist_${timestamp}.txt`);
    let fileListContent = '';
    
    // Make sure paths are formatted properly for FFmpeg
    normalizedFiles.forEach(file => {
      fileListContent += `file '${file.replace(/\\/g, '/').replace(/'/g, "'\\''")}'` + '\n';
    });
    
    fs.writeFileSync(fileListPath, fileListContent);
    console.log(`File list created at ${fileListPath}`);
    console.log(`File list content:\n${fileListContent}`);
    
    // Verify file list exists
    if (!fs.existsSync(fileListPath)) {
      throw new Error(`Failed to create file list at ${fileListPath}`);
    }
    
    // Now concatenate the normalized files
    const concatCmd = `${ffmpegCmd} -f concat -safe 0 -i "${fileListPath}" -c:a libmp3lame -q:a 2 "${outputPath}" -y`;
    console.log(`Running FFmpeg command: ${concatCmd}`);
    
    try {
      const { stdout, stderr } = await exec(concatCmd);
      console.log(`FFmpeg stdout: ${stdout || 'None'}`);
      if (stderr) {
        console.log(`FFmpeg stderr: ${stderr}`);
      }
      
      // Verify if output file was created
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        console.log(`Audio files concatenated successfully to ${outputPath}`);
      } else {
        throw new Error(`FFmpeg completed but output file is missing or empty: ${outputPath}`);
      }
    } catch (execError) {
      console.error(`FFmpeg concatenation error: ${execError.message}`);
      console.error(`stderr: ${execError.stderr || 'None'}`);
      console.error(`stdout: ${execError.stdout || 'None'}`);
      throw execError;
    }
    
    // Clean up normalized files and file list
    try {
      normalizedFiles.forEach(file => {
        fs.unlinkSync(file);
      });
      
      fs.unlinkSync(fileListPath);
      console.log('Temporary files cleaned up');
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
      // Non-critical error, continue
    }
  } catch (error) {
    console.error(`Error during audio concatenation process: ${error.message}`);
    throw error;
  }
}

/**
 * Create a silent audio file as a fallback
 * @param {string} outputPath - Path where the silent audio should be saved
 * @param {number} durationSeconds - Duration of silent audio in seconds
 * @param {string} baseDir - Base directory of the application
 * @returns {Promise<void>}
 */
export async function createSilentAudio(outputPath, durationSeconds = 2, baseDir) {
  const ffmpegCmd = getFFmpegPath(baseDir);
  
  try {
    // Create a silent audio file of the specified duration
    const command = `${ffmpegCmd} -f lavfi -i anullsrc=r=44100:cl=stereo -t ${durationSeconds} -q:a 9 -acodec pcm_s16le "${outputPath}" -y`;
    console.log(`Creating silent audio file: ${command}`);
    
    const { stdout, stderr } = await exec(command);
    if (stderr) {
      console.log(`FFmpeg stderr: ${stderr}`);
    }
    console.log(`Created silent audio file: ${outputPath}`);
  } catch (error) {
    console.error(`Failed to create silent audio file: ${error.message}`);
    throw error;
  }
}

/**
 * Get the duration of an audio file
 * @param {string} filePath - Path to the audio file
 * @param {string} baseDir - Base directory of the application
 * @returns {Promise<number>} - Duration in seconds
 */
export async function getAudioDuration(filePath, baseDir) {
  const ffprobeCmd = getFFprobePath(baseDir);
  
  try {
    // Get audio duration using ffprobe
    const durationCmd = `${ffprobeCmd} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const { stdout } = await exec(durationCmd);
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error(`Error getting duration for ${filePath}:`, error);
    throw error;
  }
}
