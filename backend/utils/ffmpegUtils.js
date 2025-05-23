import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure ffmpeg with installed binaries
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

/**
 * Creates an FFmpeg command instance
 * @param {string} input - Input file path
 * @returns {FfmpegCommand} FFmpeg command object
 */
export function createFfmpeg(input) {
  return ffmpeg(input);
}

/**
 * Run FFmpeg to convert audio from one format to another
 * @param {string} inputPath - Path to input file
 * @param {string} outputPath - Path for output file
 * @param {Object} options - Conversion options
 * @returns {Promise<string>} - Path to output file
 */
export function convertAudio(inputPath, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Converting audio: ${inputPath} to ${outputPath}`);
    
    const command = ffmpeg(inputPath);
    
    // Apply codec if specified
    if (options.codec) {
      command.audioCodec(options.codec);
    }
    
    // Apply sample rate if specified
    if (options.sampleRate) {
      command.audioFrequency(options.sampleRate);
    }
    
    // Apply bitrate if specified
    if (options.bitrate) {
      command.audioBitrate(options.bitrate);
    }
    
    // Apply quality
    if (options.quality) {
      command.addOutputOption('-qscale:a', options.quality);
    }
    
    command
      .on('start', (commandLine) => {
        console.log('FFmpeg conversion started:', commandLine);
      })
      .on('error', (err) => {
        console.error('Error converting audio:', err.message);
        reject(err);
      })
      .on('end', () => {
        console.log('FFmpeg conversion complete');
        // Check if the output exists and is not empty
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          resolve(outputPath);
        } else {
          reject(new Error('FFmpeg completed but output file is missing or empty'));
        }
      })
      .save(outputPath);
  });
}

/**
 * Apply voice effects to audio file
 * @param {string} inputPath - Path to input file
 * @param {string} outputPath - Path for output file
 * @param {Object} options - Voice effect options
 * @returns {Promise<string>} - Path to output file
 */
export function applyVoiceEffects(inputPath, outputPath, options = {}) {
  const { pitch = 0, speedFactor = 1.0 } = options;
  
  return new Promise((resolve, reject) => {
    console.log(`Applying voice effects: pitch=${pitch}, speedFactor=${speedFactor}`);
    
    let command = ffmpeg(inputPath);
    const filters = [];
    
    // Apply pitch shift if needed
    if (pitch !== 0) {
      filters.push(`asetrate=44100*${1.0 + pitch*0.1},atempo=1/${1.0 + pitch*0.1}`);
    }
    
    // Apply speed adjustment if needed
    if (speedFactor !== 1.0) {
      filters.push(`atempo=${speedFactor}`);
    }
    
    // Apply filters if any
    if (filters.length > 0) {
      command = command.audioFilters(filters);
    }
    
    command
      .on('start', (commandLine) => {
        console.log('FFmpeg voice effects started:', commandLine);
      })
      .on('error', (err) => {
        console.error('Error applying voice effects:', err.message);
        reject(err);
      })
      .on('end', () => {
        console.log('FFmpeg voice effects complete');
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

/**
 * Concatenate multiple audio files into one
 * @param {Array<string>} inputFiles - Array of input file paths
 * @param {string} outputPath - Path for the combined output
 * @returns {Promise<string>} - Path to output file
 */
export function concatenateAudio(inputFiles, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Concatenating ${inputFiles.length} audio files to ${outputPath}`);
    
    // Create a command that will join the files
    const command = ffmpeg();
    
    // Add all input files
    inputFiles.forEach(file => {
      command.input(file);
    });
    
    command
      .on('start', (commandLine) => {
        console.log('FFmpeg concatenation started:', commandLine);
      })
      .on('error', (err) => {
        console.error('Error concatenating audio:', err.message);
        reject(err);
      })
      .on('end', () => {
        console.log('FFmpeg concatenation complete');
        resolve(outputPath);
      })
      // Use the concat filter to join files
      .complexFilter(`concat=n=${inputFiles.length}:v=0:a=1[aout]`)
      .outputOptions(['-map [aout]'])
      .save(outputPath);
  });
}

/**
 * Get audio duration using FFprobe
 * @param {string} filePath - Path to audio file
 * @returns {Promise<number>} - Duration in seconds
 */
export function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error getting audio duration:', err.message);
        reject(err);
        return;
      }
      if (metadata && metadata.format && metadata.format.duration) {
        resolve(parseFloat(metadata.format.duration));
      } else {
        reject(new Error('Could not determine audio duration'));
      }
    });
  });
}

/**
 * Verify a media file is valid
 * @param {string} filePath - Path to the media file
 * @returns {Promise<boolean>} - Whether the file is valid
 */
export function verifyMediaFile(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Media file verification failed:', err.message);
        resolve(false);
        return;
      }
      
      resolve(true);
    });
  });
}

/**
 * Add audio to a video file
 * @param {string} videoPath - Path to video file
 * @param {string} audioPath - Path to audio file
 * @param {string} outputPath - Path for output file
 * @returns {Promise<string>} - Path to output file
 */
export function addAudioToVideo(videoPath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(audioPath)
      .outputOptions([
        '-c:v copy',        // Copy the video codec
        '-c:a aac',         // Use AAC for audio
        '-shortest'         // Finish encoding when shortest input stream ends
      ])
      .on('start', (commandLine) => {
        console.log('FFmpeg add audio started:', commandLine);
      })
      .on('error', (err) => {
        console.error('Error adding audio to video:', err.message);
        reject(err);
      })
      .on('end', () => {
        console.log('FFmpeg add audio complete');
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

/**
 * Add subtitles to a video file
 * @param {string} videoPath - Path to video file
 * @param {string} subtitlePath - Path to subtitle file
 * @param {string} outputPath - Path for output file
 * @returns {Promise<string>} - Path to output file
 */
export function addSubtitlesToVideo(videoPath, subtitlePath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .inputOptions(['-i', subtitlePath])
      .outputOptions([
        '-c:v copy',        // Copy the video codec
        '-c:a copy',        // Copy the audio codec
        '-c:s mov_text',    // Use mov_text codec for subtitles
        '-map 0:v',         // Map video from first input
        '-map 0:a',         // Map audio from first input
        '-map 1:s'          // Map subtitle from second input
      ])
      .on('start', (commandLine) => {
        console.log('FFmpeg add subtitles started:', commandLine);
      })
      .on('error', (err) => {
        console.error('Error adding subtitles to video:', err.message);
        reject(err);
      })
      .on('end', () => {
        console.log('FFmpeg add subtitles complete');
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

/**
 * Create a silent audio file
 * @param {string} outputPath - Path for the output file
 * @param {number} durationSeconds - Duration of silence in seconds
 * @returns {Promise<string>} - Path to the output file
 */
export function createSilentAudio(outputPath, durationSeconds = 2) {
  return new Promise((resolve, reject) => {
    console.log(`Creating silent audio file of ${durationSeconds} seconds at ${outputPath}`);
    
    ffmpeg()
      .input('anullsrc')
      .inputFormat('lavfi')
      .inputOptions([
        '-r', '44100',      // Sample rate
        '-cl', 'stereo'     // Channel layout
      ])
      .outputOptions([
        '-t', durationSeconds.toString(),  // Duration
        '-q:a', '9',                       // Quality
        '-acodec', 'pcm_s16le'             // Audio codec
      ])
      .on('start', (commandLine) => {
        console.log('FFmpeg silent audio creation started:', commandLine);
      })
      .on('error', (err) => {
        console.error('Error creating silent audio:', err.message);
        reject(err);
      })
      .on('end', () => {
        console.log('Silent audio creation complete');
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

/**
 * Check if FFmpeg is installed and functional
 * @returns {Promise<Object>} - Object with FFmpeg status
 */
export async function checkFFmpegInstallation() {
  const results = {
    ffmpegExists: true, // We're using the npm module
    ffprobeExists: true, // We're using the npm module
    ffmpegVersion: null,
    ffmpegWorking: false,
    systemPath: null,
    errors: []
  };
  
  try {
    // Try to get FFmpeg version using fluent-ffmpeg
    const versionData = await new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          resolve(null);
          return;
        }
        
        // If we get formats, FFmpeg is working
        resolve({
          path: ffmpegInstaller.path,
          working: true
        });
      });
    });
    
    if (versionData) {
      results.ffmpegVersion = `ffmpeg-installer ${ffmpegInstaller.version}`;
      results.ffmpegWorking = true;
      results.systemPath = versionData.path;
    } else {
      results.errors.push('FFmpeg is not working properly');
    }
  } catch (error) {
    results.errors.push(`Error checking FFmpeg: ${error.message}`);
  }
  
  return results;
}

/**
 * Generate a HTML report about FFmpeg status
 * @returns {Promise<string>} - HTML report
 */
export async function generateFFmpegReport() {
  const results = await checkFFmpegInstallation();
  
  let html = `
  <html>
  <head>
    <title>FFmpeg System Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1 { color: #333; }
      .status { margin-top: 20px; }
      .success { color: green; }
      .error { color: red; }
      ul { list-style-type: none; padding-left: 10px; }
      li { margin: 5px 0; }
    </style>
  </head>
  <body>
    <h1>FFmpeg System Report</h1>
    <div class="status">
      <h2>Status</h2>
      <ul>
        <li>FFmpeg available: <strong>${results.ffmpegExists ? 'Yes' : 'No'}</strong></li>
        <li>FFprobe available: <strong>${results.ffprobeExists ? 'Yes' : 'No'}</strong></li>
        <li>FFmpeg working: <strong class="${results.ffmpegWorking ? 'success' : 'error'}">${results.ffmpegWorking ? 'Yes' : 'No'}</strong></li>
        <li>FFmpeg version: <strong>${results.ffmpegVersion || 'Unknown'}</strong></li>
        <li>FFmpeg path: <strong>${results.systemPath || 'Unknown'}</strong></li>
      </ul>
    </div>
  `;
  
  if (results.errors.length > 0) {
    html += `
    <div class="status">
      <h2>Errors</h2>
      <ul class="error">
        ${results.errors.map(error => `<li>${error}</li>`).join('')}
      </ul>
    </div>
    `;
  }
  
  html += `
    <div class="status">
      <h2>Recommendations</h2>
      <ul>
  `;
  
  if (!results.ffmpegWorking) {
    html += '<li>Using ffmpeg-installer and ffprobe-installer npm packages.</li>';
    html += '<li>This provides cross-platform compatibility for your application.</li>';
  }
  
  html += `
      </ul>
    </div>
  </body>
  </html>
  `;
  
  return html;
}
