import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Clean up temporary files for a specific session
 * @param {string} sessionId - The session ID to clean up
 * @returns {Promise<Object>} - Result of the cleanup operation
 */
export const cleanupSessionFiles = async (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('session-')) {
    console.error('Invalid session ID format for cleanup');
    return { success: false, message: 'Invalid session ID format' };
  }

  try {
    const tempDir = path.join(__dirname, '../temp', sessionId);
    let filesRemoved = 0;
    
    // Check if session temp directory exists
    if (fs.existsSync(tempDir)) {
      console.log(`Cleaning up temp directory for session: ${sessionId}`);
      
      // Read all files in the directory
      const files = fs.readdirSync(tempDir);
      
      // Delete each file
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        fs.unlinkSync(filePath);
        filesRemoved++;
      }
      
      // Remove the directory
      fs.rmdirSync(tempDir);
      console.log(`Removed temp directory for session: ${sessionId}`);
      
      return { 
        success: true, 
        message: `Cleanup successful: removed ${filesRemoved} files and directory` 
      };
    } else {
      console.log(`No temp directory found for session: ${sessionId}`);
      return { success: true, message: 'No temp directory found for this session' };
    }
  } catch (error) {
    console.error(`Error during cleanup for session ${sessionId}:`, error);
    return { 
      success: false, 
      message: `Error during cleanup: ${error.message}` 
    };
  }
};

/**
 * Controller to handle cleanup requests
 */
export const cleanupSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const result = await cleanupSessionFiles(sessionId);
    
    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        message: result.message 
      });
    } else {
      return res.status(500).json({ 
        error: 'Cleanup failed', 
        details: result.message 
      });
    }
  } catch (error) {
    console.error('Error in cleanup controller:', error);
    return res.status(500).json({ 
      error: 'Failed to clean up session files', 
      details: error.message 
    });
  }
};
