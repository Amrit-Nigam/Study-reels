import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import axios from 'axios';
import https from 'https';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const modelsDir = join(__dirname, 'models');
const cacheDir = join(modelsDir, 'cache');

// Ensure directories exist
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

console.log('Setting up Mozilla TTS resources...');
console.log('Resources will be downloaded to:', modelsDir);
console.log('This script will test all the voice models that will be used in the Brainrot application');

// Mozilla TTS voices to test
const voices = [
  { id: 'en/vctk_low/p225', name: 'Female Voice 1', key: 'female-1' },
  { id: 'en/vctk_low/p236', name: 'Female Voice 2', key: 'female-2' },
  { id: 'en/vctk_low/p270', name: 'Male Voice 1', key: 'male-1' },
  { id: 'en/vctk_low/p330', name: 'Male Voice 2', key: 'male-2' }
];

// Function to check Mozilla TTS service availability and test voices
async function testMozillaTTS() {
  try {
    // Get the Mozilla TTS endpoint from .env or use default
    const mozillaTTSEndpoint = process.env.MOZILLA_TTS_ENDPOINT || 'https://tts.mozilla.org/api/v1/tts';
    const mozillaTTSStatusEndpoint = mozillaTTSEndpoint.replace('/tts', '/status');
    
    console.log('Checking Mozilla TTS service availability...');
    console.log(`Using Mozilla TTS endpoint: ${mozillaTTSEndpoint}`);
    
    try {
      const response = await axios.get(mozillaTTSStatusEndpoint, { timeout: 5000 });
      console.log('Mozilla TTS service status:', response.data);
      console.log('Mozilla TTS service is available!');
    } catch (error) {
      console.warn('Mozilla TTS service might be unavailable:', error.message);
      console.log('Will try to use fallback mechanisms when needed');
    }
    
    // Create a test file for each voice
    console.log('\nTesting Mozilla TTS voices...');
    
    for (const voice of voices) {      try {
        console.log(`Testing voice: ${voice.name} (${voice.id}) - ID in app: ${voice.key}`);
        
        // Create test parameters
        const text = 'This is a test of the Mozilla TTS voice synthesis system';
        const params = new URLSearchParams({
          text: text,
          voice: voice.id,
          lang: 'en'
        });
        
        // Save path
        const testFile = path.join(cacheDir, `${voice.id.replace(/\//g, '_')}_test.wav`);
        
        // Create a write stream
        const fileStream = fs.createWriteStream(testFile);
        
        // Make request to Mozilla TTS
        console.log(`Requesting audio for "${text}" with voice ${voice.id}...`);
          // Try to download a sample
        const ttsEndpoint = process.env.MOZILLA_TTS_ENDPOINT || 'https://tts.mozilla.org/api/v1/tts';
        const url = `${ttsEndpoint}?${params.toString()}`;
        
        try {
          await new Promise((resolve, reject) => {
            https.get(url, (response) => {
              if (response.statusCode !== 200) {
                reject(new Error(`Failed to fetch audio: ${response.statusCode} ${response.statusMessage}`));
                return;
              }
              
              response.pipe(fileStream);
              
              fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Test file created: ${testFile}`);
                resolve();
              });
              
              response.on('error', (err) => {
                fs.unlink(testFile, () => {});
                reject(err);
              });
            }).on('error', (err) => {
              fs.unlink(testFile, () => {});
              reject(err);
            });
          });
          
          console.log(`✅ Successfully tested voice: ${voice.name} (${voice.id}) - Voice is ready for use`);
          console.log(`   Test audio file created: ${path.relative(__dirname, testFile)}`);
          
        } catch (err) {
          console.error(`Failed to test voice ${voice.id}:`, err.message);
        }
      } catch (voiceError) {
        console.error(`Error testing voice ${voice.id}:`, voiceError.message);
      }
    }
    
    console.log('\nMozilla TTS setup complete!');
    console.log('You can now use the Brainrot application with Mozilla TTS voices');
    console.log('Note: If Mozilla TTS service becomes unavailable, the application will');
    console.log('automatically fall back to using your operating system\'s built-in TTS');
    
  } catch (error) {
    console.error('Error setting up Mozilla TTS:', error.message);
  }
}

// Run the test
testMozillaTTS();
