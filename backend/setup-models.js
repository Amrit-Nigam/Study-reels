import tts from 'tts';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const modelsDir = join(__dirname, process.env.COQUI_MODEL_DIR || 'models');

// Ensure models directory exists
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

console.log('Setting up Coqui TTS models...');
console.log('Models will be downloaded to:', modelsDir);

// List of models to download
const models = [
  'tts_models/en/ljspeech/tacotron2-DDC',
  'tts_models/en/vctk/vits'
];

// Download each model
async function downloadModels() {
  try {
    for (const model of models) {
      console.log(`Downloading model: ${model}`);
      
      try {
        // Check if the model is already downloaded
        const models = await tts.list_models();
        console.log('Available models:', models);
        const isModelAvailable = models.some(m => m.name === model);
        if (isModelAvailable) {
          console.log(`Model ${model} is already available`);
        } else {
          throw new Error('Model not found');
        }
      } catch (err) {
        // Model not found, download it
        console.log(`Downloading model ${model}...`);
        await tts.download_model({model_name: model});
        console.log(`Model ${model} downloaded successfully`);
      }
    }
    
    console.log('All models downloaded successfully!');
    
  } catch (error) {
    console.error('Error downloading models:', error);
  }
}

downloadModels();
