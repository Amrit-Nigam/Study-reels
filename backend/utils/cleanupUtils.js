import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Cleanup utility for removing old temporary files
 * This can be scheduled to run periodically to prevent disk space issues
 */
export async function cleanupOldTempFiles() {
  try {
    console.log('Starting scheduled cleanup of old temporary files');
    
    const tempDir = path.join(__dirname, '../temp');
    const uploadsDir = path.join(__dirname, '../uploads');
    let tempFilesRemoved = 0;
    let uploadsFilesRemoved = 0;
    
    // Get current time for age comparison
    const now = Date.now();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    // Clean up old session directories in temp folder
    if (fs.existsSync(tempDir)) {
      try {
        const sessionDirs = fs.readdirSync(tempDir);
        
        for (const sessionDir of sessionDirs) {
          const sessionPath = path.join(tempDir, sessionDir);
          
          // Check if it's a directory and starts with 'session-'
          if (fs.statSync(sessionPath).isDirectory() && sessionDir.startsWith('session-')) {
            // Extract timestamp from session ID to determine age
            const matches = sessionDir.match(/session-(\d+)/);
            
            if (matches && matches[1]) {
              const sessionTimestamp = parseInt(matches[1], 10);
              const sessionAge = now - sessionTimestamp;
              
              // If session directory is older than max age, remove it
              if (sessionAge > maxAgeMs) {
                console.log(`Removing old session directory: ${sessionDir}`);
                
                // Remove all files in the directory
                const files = fs.readdirSync(sessionPath);
                for (const file of files) {
                  fs.unlinkSync(path.join(sessionPath, file));
                  tempFilesRemoved++;
                }
                
                // Remove the directory itself
                fs.rmdirSync(sessionPath);
                console.log(`Removed session directory: ${sessionDir}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error cleaning up temp directories:', error);
      }
    }
    
    // Clean up old files in uploads folder
    if (fs.existsSync(uploadsDir)) {
      try {
        const files = fs.readdirSync(uploadsDir);
        
        for (const file of files) {
          // Skip directories
          const filePath = path.join(uploadsDir, file);
          if (!fs.statSync(filePath).isFile()) continue;
          
          // Check for session ID in filename
          if (file.includes('session-')) {
            // Get file stats
            const stats = fs.statSync(filePath);
            const fileAge = now - stats.mtimeMs;
            
            // If file is older than max age, remove it
            if (fileAge > maxAgeMs) {
              console.log(`Removing old uploaded file: ${file}`);
              fs.unlinkSync(filePath);
              uploadsFilesRemoved++;
            }
          }
        }
      } catch (error) {
        console.error('Error cleaning up uploads folder:', error);
      }
    }
    
    console.log(`Cleanup complete: removed ${tempFilesRemoved} temp files and ${uploadsFilesRemoved} upload files`);
    return {
      success: true,
      tempFilesRemoved,
      uploadsFilesRemoved
    };
  } catch (error) {
    console.error('Error during scheduled cleanup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
