// filepath: d:\code\Brainrot\backend\utils\systemCheck.js 
// This utility helps verify the FFmpeg installation and diagnose issues 
 
import fs from 'fs'; 
import path from 'path'; 
import { fileURLToPath } from 'url'; 
import { dirname } from 'path'; 
 
const __filename = fileURLToPath(import.meta.url); 
const __dirname = dirname(__filename); 
 
// Import the FFmpeg utilities 
import { checkFFmpegInstallation as checkFfmpegFromUtils, generateFFmpegReport as generateReportFromUtils } from './ffmpegUtils.js'; 
 
/** 
 * Check if FFmpeg executables exist and are functional 
 * @returns {Promise<Object>} Object with check results 
 */ 
export async function checkFFmpegInstallation() { 
  try { 
    // Use the imported function from ffmpegUtils 
    return await checkFfmpegFromUtils(); 
  } catch (error) { 
    return { 
      ffmpegExists: false, 
      ffprobeExists: false, 
      ffmpegVersion: null, 
      ffmpegWorking: false, 
      systemPath: null, 
      errors: [error.message] 
    }; 
  } 
} 
 
/** 
 * Generate a HTML report about FFmpeg status 
 * @returns {Promise<string>} - HTML report 
 */ 
export async function generateFFmpegReport() { 
  try { 
    // Use the imported function from ffmpegUtils 
    return await generateReportFromUtils(); 
  } catch (error) { 
    // Return a simple HTML error report 
    return ` 
    <html> 
      <head> 
        <title>FFmpeg System Report - Error</title> 
        <style> 
          body { font-family: Arial, sans-serif; margin: 20px; } 
          h1 { color: #333; } 
          .error { color: red; } 
        </style> 
      </head> 
      <body> 
        <h1>FFmpeg System Report</h1> 
        <div class="error"> 
          <h2>Error Generating Report</h2> 
          <p>${error.message}</p> 
          <p>Using fluent-ffmpeg with @ffmpeg-installer/ffmpeg and @ffprobe-installer/ffprobe packages.</p> 
        </div> 
      </body> 
    </html> 
    `; 
  } 
} 
