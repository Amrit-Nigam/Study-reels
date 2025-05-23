import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

/**
 * Concatenate multiple audio files into a single file
 * This is a minimalist version that focuses only on concatenation
 */
export async function concatenateAudioFiles(audioFiles, outputPath, tempDir, baseDir) {
  console.log(`Concatenating ${audioFiles.length} audio files to ${outputPath}`);
  
  // Handle single file case
  if (audioFiles.length === 1) {
    fs.copyFileSync(audioFiles[0].path, outputPath);
    return;
  }

  // Verify all input files exist
  const validFiles = audioFiles.filter(file => fs.existsSync(file.path));
  if (validFiles.length === 0) throw new Error('No valid audio files found');
    // Create a concat list file for FFmpeg
  const timestamp = Date.now();
  const concatListPath = path.join(tempDir, `concat_${timestamp}.txt`);
  
  // Write each file path to the list with the right format for Windows
  // The key fix here is using double quotes instead of single quotes for paths
  const fileContent = validFiles.map(file => {
    // Convert Windows paths to the format FFmpeg expects
    const filePath = file.path.replace(/\\/g, '/');
    return `file '${filePath}'`;
  }).join('\n');
  
  // Output the file list for debugging
  console.log(`File list content for concatenation:\n${fileContent}`);
  fs.writeFileSync(concatListPath, fileContent);
  
  // Find ffmpeg executable
  const ffmpegPath = path.join(baseDir, 'ffmpeg.exe');
  const ffmpegCmd = fs.existsSync(ffmpegPath)
    ? `"${ffmpegPath}" -f concat -safe 0 -i "${concatListPath}" -c copy "${outputPath}" -y`
    : `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy "${outputPath}" -y`;
    // Execute FFmpeg to concatenate the files
  console.log(`Executing FFmpeg concatenation command: ${ffmpegCmd}`);
  const { stdout, stderr } = await exec(ffmpegCmd);
  
  if (stderr) {
    console.log(`FFmpeg stderr output (not necessarily an error): ${stderr}`);
  }
  
  // Verify the output file
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    console.log(`Concatenated output file created: ${outputPath} (${stats.size} bytes)`);
  } else {
    console.log(`Failed to create output file at ${outputPath}`);
  }
  
  // Clean up
  if (fs.existsSync(concatListPath)) {
    console.log(`Cleaning up temporary list file: ${concatListPath}`);
    fs.unlinkSync(concatListPath);
  }
}
