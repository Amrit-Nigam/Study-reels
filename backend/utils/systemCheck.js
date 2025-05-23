// This utility helps verify the FFmpeg installation and diagnose issues

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Check if FFmpeg executables exist and are functional
 * @returns {Promise<Object>} Object with check results
 */
export async function checkFFmpegInstallation() {
  const baseDir = path.join(__dirname, '..');
  const results = {
    ffmpegExists: false,
    ffprobeExists: false,
    ffmpegVersion: null,
    ffmpegWorking: false,
    systemPath: null,
    errors: []
  };

  try {
    // Check if local executables exist
    const ffmpegPath = path.join(baseDir, 'ffmpeg.exe');
    const ffprobePath = path.join(baseDir, 'ffprobe.exe');

    results.ffmpegExists = fs.existsSync(ffmpegPath);
    results.ffprobeExists = fs.existsSync(ffprobePath);

    // Try to get FFmpeg version
    try {
      const command = results.ffmpegExists ? 
        `"${ffmpegPath}" -version` : 
        'ffmpeg -version';
      
      const { stdout } = await exec(command);
      results.ffmpegVersion = stdout.split('\n')[0];
      results.ffmpegWorking = true;
    } catch (verError) {
      results.errors.push({
        component: 'ffmpeg-version',
        message: verError.message,
        stderr: verError.stderr
      });
    }

    // Check PATH environment variable
    try {
      const { stdout: pathOutput } = await exec('echo %PATH%');
      results.systemPath = pathOutput.trim();
    } catch (pathError) {
      results.errors.push({
        component: 'system-path',
        message: pathError.message
      });
    }

    // Run a simple FFmpeg test
    try {
      // Create a small test silent audio file
      const testOutputPath = path.join(baseDir, 'temp', 'ffmpeg_test.mp3');
      const testCommand = results.ffmpegExists ?
        `"${ffmpegPath}" -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -y "${testOutputPath}"` :
        `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -y "${testOutputPath}"`;
      
      await exec(testCommand);
      
      if (fs.existsSync(testOutputPath)) {
        results.ffmpegWorking = true;
        try {
          fs.unlinkSync(testOutputPath); // Clean up test file
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      } else {
        results.errors.push({
          component: 'ffmpeg-test',
          message: 'Failed to create test file'
        });
      }
    } catch (testError) {
      results.errors.push({
        component: 'ffmpeg-test',
        message: testError.message,
        stderr: testError.stderr
      });
    }

    return results;
  } catch (error) {
    results.errors.push({
      component: 'general',
      message: error.message
    });
    return results;
  }
}

/**
 * Generate a report about the FFmpeg installation
 * @returns {Promise<string>} HTML report
 */
export async function generateFFmpegReport() {
  const results = await checkFFmpegInstallation();
  
  // Create an HTML report
  let html = '<html><head><style>';
  html += 'body { font-family: Arial, sans-serif; margin: 20px; }';
  html += 'h1 { color: #333; }';
  html += '.status { padding: 10px; margin: 10px 0; border-radius: 5px; }';
  html += '.success { background-color: #d4edda; color: #155724; }';
  html += '.warning { background-color: #fff3cd; color: #856404; }';
  html += '.danger { background-color: #f8d7da; color: #721c24; }';
  html += '.code { background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }';
  html += '</style></head><body>';
  
  html += '<h1>FFmpeg Installation Report</h1>';
  
  // Overall status
  if (results.ffmpegWorking) {
    html += '<div class="status success">FFmpeg appears to be working correctly.</div>';
  } else {
    html += '<div class="status danger">FFmpeg is NOT working correctly. See details below.</div>';
  }
  
  // FFmpeg executables
  html += '<h2>FFmpeg Executables</h2>';
  html += '<ul>';
  html += `<li>ffmpeg.exe exists: <strong>${results.ffmpegExists ? 'Yes' : 'No'}</strong></li>`;
  html += `<li>ffprobe.exe exists: <strong>${results.ffprobeExists ? 'Yes' : 'No'}</strong></li>`;
  html += '</ul>';
  
  // FFmpeg version
  if (results.ffmpegVersion) {
    html += '<h2>FFmpeg Version</h2>';
    html += `<div class="code">${results.ffmpegVersion}</div>`;
  }
  
  // System PATH (truncated for readability)
  if (results.systemPath) {
    html += '<h2>System PATH (first 200 chars)</h2>';
    html += `<div class="code">${results.systemPath.substring(0, 200)}...</div>`;
  }
  
  // Errors
  if (results.errors.length > 0) {
    html += '<h2>Errors</h2>';
    html += '<ul>';
    for (const error of results.errors) {
      html += `<li><strong>${error.component}:</strong> ${error.message}</li>`;
      if (error.stderr) {
        html += `<div class="code">${error.stderr}</div>`;
      }
    }
    html += '</ul>';
  }
  
  // Recommendations
  html += '<h2>Recommendations</h2>';
  html += '<ul>';
  if (!results.ffmpegExists) {
    html += '<li>Ensure ffmpeg.exe is present in the backend directory.</li>';
  }
  if (!results.ffprobeExists) {
    html += '<li>Ensure ffprobe.exe is present in the backend directory.</li>';
  }
  if (results.errors.length > 0) {
    html += '<li>Check that FFmpeg has all required system DLLs (vcruntime140.dll, etc.).</li>';
    html += '<li>Try reinstalling FFmpeg from the official site or using a different build.</li>';
    html += '<li>Make sure your antivirus is not blocking FFmpeg execution.</li>';
  }
  html += '</ul>';
  
  html += '</body></html>';
  
  return html;
}

// When run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const results = await checkFFmpegInstallation();
    console.log(JSON.stringify(results, null, 2));
    
    const reportPath = path.join(dirname(__dirname), 'ffmpeg-report.html');
    fs.writeFileSync(reportPath, await generateFFmpegReport());
    console.log(`Report saved to ${reportPath}`);
  } catch (error) {
    console.error('Error running system check:', error);
  }
}
