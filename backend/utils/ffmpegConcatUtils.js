import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

/**
 * Concatenate multiple audio files into a single file using fluent-ffmpeg
 * @param {Array<Object>} audioFiles - Array of audio file objects with path property
 * @param {string} outputPath - Path for the output file
 * @returns {Promise<string>} - Path to the output file
 */
export async function concatenateAudioFiles(audioFiles, outputPath) {
  console.log(`Concatenating ${audioFiles.length} audio files to ${outputPath}`);
  
  // Handle single file case
  if (audioFiles.length === 1) {
    fs.copyFileSync(audioFiles[0].path, outputPath);
    return outputPath;
  }

  // Verify all input files exist
  const validFiles = audioFiles.filter(file => fs.existsSync(file.path));
  if (validFiles.length === 0) {
    throw new Error('No valid audio files found');
  }
  
  // Create a temporary concat list file for FFmpeg
  const tempDir = path.dirname(validFiles[0].path);
  const timestamp = Date.now();
  const concatListPath = path.join(tempDir, `concat_${timestamp}.txt`);
  
  // Write each file path to the list with the right format
  const fileContent = validFiles.map(file => {
    // Convert to the format FFmpeg expects with single quotes
    const filePath = file.path.replace(/\\/g, '/');
    return `file '${filePath}'`;
  }).join('\n');
  
  // Output the file list for debugging
  console.log(`Creating file list for concatenation at ${concatListPath}`);
  fs.writeFileSync(concatListPath, fileContent);
  
  return new Promise((resolve, reject) => {
    // Create FFmpeg command for concatenation
    ffmpeg()
      .input(concatListPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])  // Copy codecs, no re-encoding
      .on('start', (commandLine) => {
        console.log('FFmpeg concatenation started:', commandLine);
      })
      .on('error', (err) => {
        console.error('Error in FFmpeg concatenation:', err.message);
        // Try to clean up the concat file
        try {
          fs.unlinkSync(concatListPath);
        } catch (e) {
          console.error('Could not remove concat list file:', e.message);
        }
        reject(err);
      })
      .on('end', () => {
        console.log('FFmpeg concatenation completed');
        // Clean up the concat file
        try {
          fs.unlinkSync(concatListPath);
        } catch (e) {
          console.error('Could not remove concat list file:', e.message);
        }
        resolve(outputPath);
      })
      .save(outputPath);
  });
}
