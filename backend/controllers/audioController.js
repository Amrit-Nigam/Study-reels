import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fsExtra from 'fs-extra';
import https from 'https';
import { promisify } from 'util';
import { pipeline as pipelineCallback } from 'stream';
const pipeline = promisify(pipelineCallback);
dotenv.config();

// Nari TTS API configuration
const NARI_TTS_API_URL = 'https://api.neets.ai/v1/tts';

// ElevenLabs API configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the new FFmpeg utility functions
import { convertAudio } from '../utils/ffmpegUtils.js';

// Helper function to generate audio using ElevenLabs API
async function generateElevenLabsAudio(text, voiceId) {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY environment variable not set');
    }
    
    console.log(`Generating audio with ElevenLabs using voice ${voiceId}`);
    
    // Map voice IDs to ElevenLabs voice IDs
    // These are example IDs - you'll need to replace with actual ElevenLabs voice IDs
    const elevenLabsVoiceMap = {
      'female-1': '21m00Tcm4TlvDq8ikWAM', // Rachel
      'female-2': 'AZnzlk1XvdvUeBnXmlld', // Domi
      'female-3': 'EXAVITQu4vr4xnSDxMaL', // Bella
      'female-4': 'ThT5KcBeYPX3keUQqHPh', // Dorothy
      'male-1': 'TxGEqnHWrfWFTfGW9XjX', // Josh
      'male-2': 'VR6AewLTigWG4xSOukaG', // Arnold
      'male-3': 'pNInz6obpgDQGcFmaJgB', // Adam
      'male-4': 'jBpfuIE2acCO8z3wKNLl', // Sam
    };
    
    // Get the ElevenLabs voice ID or use a default
    const elevenLabsVoiceId = elevenLabsVoiceMap[voiceId] || elevenLabsVoiceMap['female-1'];
    
    // First do a ping test to check API key validity and account status
    try {
      const accountResponse = await axios({
        method: 'get',
        url: `${ELEVENLABS_API_URL}/user/subscription`,
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout for quick check
      });
      
      console.log(`ElevenLabs account status: ${accountResponse.status}`);
      console.log(`Character quota: ${accountResponse.data?.character_count || 'unknown'} / ${accountResponse.data?.character_limit || 'unknown'}`);
    } catch (pingError) {
      console.error(`ElevenLabs account check failed: ${pingError.message}`);
      if (pingError.response) {
        console.error('Account status response:', pingError.response.status, pingError.response.data);
      }
      throw new Error(`ElevenLabs API key validation failed: ${pingError.message}`);
    }
    
    // Prepare request body with updated model ID
    const requestBody = {
      text: text,
      model_id: 'eleven_multilingual_v2', // Updated model to latest version
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    };
    
    // Make API request to ElevenLabs with updated headers and options
    const response = await axios({
      method: 'post',
      url: `${ELEVENLABS_API_URL}/text-to-speech/${elevenLabsVoiceId}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'User-Agent': 'Brainrot-Video-Generator/1.0' // Adding user agent to identify the app
      },
      data: requestBody,
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout for audio generation
    });
      // Create temporary file path
    const tempFilePath = path.join(__dirname, '../temp', `eleven_${Date.now()}.mp3`);
    
    // Write the audio buffer to a file
    fs.writeFileSync(tempFilePath, response.data);
    
    console.log(`ElevenLabs audio generated and saved to ${tempFilePath}`);
    return tempFilePath;
  } catch (error) {
    console.error(`Error generating ElevenLabs audio: ${error.message}`);
    if (error.response) {
      console.error('ElevenLabs API response:', error.response.status, error.response.data);
    }
    throw error;
  }
}

// Helper function to generate audio using Nari TTS API
async function generateNariAudio(text, speaker, voiceId) {
  try {
    // First try the API if key is available
    if (process.env.NARI_API_KEY) {
      console.log(`Generating audio with Nari TTS API for ${speaker} using voice ${voiceId}`);
      
      // Map voice IDs to Nari TTS voice settings
      const voiceSettings = {
        'female-1': {
          voice_id: 'vits',
          model: 'ar-diff-50k',
          speed: 1.0,
          pitch: 0.0
        },
        'female-2': {
          voice_id: 'vits',
          model: 'ar-diff-50k-2',
          speed: 0.9,
          pitch: 0.1
        },
        'female-3': {
          voice_id: 'vits',
          model: 'ar-diff-50k-3',
          speed: 1.1,
          pitch: -0.1
        },
        'female-4': {
          voice_id: 'vits',
          model: 'ar-diff-50k-4',
          speed: 1.0,
          pitch: 0.2
        },
        'male-1': {
          voice_id: 'vits',
          model: 'ar-diff-50k-male',
          speed: 1.0,
          pitch: -0.2
        },
        'male-2': {
          voice_id: 'vits',
          model: 'ar-diff-50k-male-2',
          speed: 0.95,
          pitch: 0.0
        },
        'male-3': {
          voice_id: 'vits',
          model: 'ar-diff-50k-male-3',
          speed: 1.05,
          pitch: -0.1
        },
        'male-4': {
          voice_id: 'vits',
          model: 'ar-diff-50k-male-4',
          speed: 1.0,
          pitch: 0.1
        }
      };
      
      // Get voice settings based on voiceId or use default
      const voiceSetting = voiceSettings[voiceId] || {
        voice_id: 'vits',
        model: speaker.toLowerCase().includes('nina') ? 'ar-diff-50k' : 'ar-diff-50k-male',
        speed: 1.0,
        pitch: 0.0
      };
      
      // Prepare request body for Nari TTS API
      const requestBody = {
        text: text,
        voice_id: voiceSetting.voice_id,
        model: voiceSetting.model,
        params: {
          speed: voiceSetting.speed,
          pitch: voiceSetting.pitch
        }
      };
      
      // Make API request to Nari TTS
      const response = await axios({
        method: 'post',
        url: NARI_TTS_API_URL,
        headers: {
          'Accept': 'audio/wav',
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NARI_API_KEY,
          'User-Agent': 'StudyReels-Video-Generator/1.0'
        },
        data: requestBody,
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      // Create temporary file path
      const tempFilePath = path.join(__dirname, '../temp', `nari_${Date.now()}.wav`);
      
      // Write the audio buffer to a file
      fs.writeFileSync(tempFilePath, response.data);
      
      console.log(`Nari TTS audio generated and saved to ${tempFilePath}`);
      return tempFilePath;
    }
    
    // If no API key, use local TTS implementation
    console.log(`Generating audio with local Nari TTS for ${speaker} using voice ${voiceId}`);
    
    // Map voice IDs to local voice settings
    const voiceSettings = {
      'female-1': {
        voice: 'en-us-female-1',
        speed: 1.0,
        pitch: 0.0
      },
      'female-2': {
        voice: 'en-us-female-2',
        speed: 0.9,
        pitch: 0.1
      },
      'female-3': {
        voice: 'en-us-female-3',
        speed: 1.1,
        pitch: -0.1
      },
      'female-4': {
        voice: 'en-us-female-4',
        speed: 1.0,
        pitch: 0.2
      },
      'male-1': {
        voice: 'en-us-male-1',
        speed: 1.0,
        pitch: -0.2
      },
      'male-2': {
        voice: 'en-us-male-2',
        speed: 0.95,
        pitch: 0.0
      },
      'male-3': {
        voice: 'en-us-male-3',
        speed: 1.05,
        pitch: -0.1
      },
      'male-4': {
        voice: 'en-us-male-4',
        speed: 1.0,
        pitch: 0.1
      }
    };
    
    // Get voice settings based on voiceId or use default
    const voiceSetting = voiceSettings[voiceId] || {
      voice: speaker.toLowerCase().includes('nina') ? 'en-us-female-1' : 'en-us-male-1',
      speed: 1.0,
      pitch: 0.0
    };
    
    // Create temporary file path
    const tempFilePath = path.join(__dirname, '../temp', `nari_${Date.now()}.wav`);
    
    // Use local TTS implementation based on platform
    const { execSync } = await import('child_process');
    
    try {
      if (process.platform === 'win32') {
        // Enhanced Windows Speech Synthesis with voice selection
        console.log('Using Windows Speech Synthesis with voice selection...');
        
        // Escape text for PowerShell
        const escapedText = text
          .replace(/"/g, '\\"')
          .replace(/[\\]/g, '\\\\')
          .replace(/'/g, "''")
          .replace(/`/g, '``')
          .replace(/\$/g, '`$')
          .replace(/\r?\n/g, ' ');
        
        // PowerShell script to select voice and set rate/pitch
        const powershellScript = `
          Add-Type -AssemblyName System.Speech;
          $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
          $voices = $synth.GetInstalledVoices();
          $selectedVoice = $voices | Where-Object { $_.VoiceInfo.Name -like "*${voiceSetting.voice.includes('female') ? 'female' : 'male'}*" } | Select-Object -First 1;
          if ($selectedVoice) { $synth.SelectVoice($selectedVoice.VoiceInfo.Name); }
          $synth.Rate = ${Math.round((voiceSetting.speed - 1) * 10)};
          $synth.SetOutputToWaveFile('${tempFilePath.replace(/\\/g, '\\\\')}');
          $synth.Speak('${escapedText}');
          $synth.Dispose();
        `;
        
        execSync(`powershell -c "${powershellScript}"`);
        
      } else if (process.platform === 'darwin') {
        // Enhanced macOS with voice selection
        console.log('Using macOS Say command with voice selection...');
        
        // Map to macOS voices
        const macVoices = {
          'female-1': 'Samantha',
          'female-2': 'Victoria',
          'female-3': 'Allison',
          'female-4': 'Susan',
          'male-1': 'Alex',
          'male-2': 'Tom',
          'male-3': 'Daniel',
          'male-4': 'Fred'
        };
        
        const selectedVoice = macVoices[voiceId] || 'Alex';
        const rate = Math.round(voiceSetting.speed * 200); // Convert to words per minute
        
        execSync(`say -v "${selectedVoice}" -r ${rate} -o "${tempFilePath}" "${text.replace(/"/g, '\\"')}"`);
        
      } else {
        // Enhanced Linux with espeak-ng
        console.log('Using Linux eSpeak-ng with voice selection...');
        
        try {
          // Check if espeak-ng is available (better than espeak)
          execSync('which espeak-ng', { stdio: 'ignore' });
          
          // Map to espeak voices
          const espeakVoice = voiceId.includes('female') ? 'en-us+f3' : 'en-us+m3';
          const speed = Math.round(voiceSetting.speed * 175);
          const pitch = Math.round(50 + (voiceSetting.pitch * 25));
          
          execSync(`espeak-ng -v "${espeakVoice}" -s ${speed} -p ${pitch} -a 200 -g 10 "${text.replace(/"/g, '\\"')}" -w "${tempFilePath}"`);
          
        } catch (espeakNgError) {
          // Fallback to regular espeak
          try {
            execSync('which espeak', { stdio: 'ignore' });
            console.log('Using Linux eSpeak...');
            
            const espeakVoice = voiceId.includes('female') ? 'en-us+f3' : 'en-us+m3';
            const speed = Math.round(voiceSetting.speed * 175);
            const pitch = Math.round(50 + (voiceSetting.pitch * 25));
            
            execSync(`espeak -v "${espeakVoice}" -s ${speed} -p ${pitch} -a 200 -g 10 "${text.replace(/"/g, '\\"')}" -w "${tempFilePath}"`);
            
          } catch (espeakError) {
            throw new Error('Neither espeak-ng nor espeak found on Linux system');
          }
        }
      }
      
      // Verify the file was created
      if (!fs.existsSync(tempFilePath) || fs.statSync(tempFilePath).size === 0) {
        throw new Error('Audio file was not created or is empty');
      }
      
      console.log(`Local Nari TTS audio generated and saved to ${tempFilePath}`);
      return tempFilePath;
      
    } catch (execError) {
      console.error(`Local TTS execution error: ${execError.message}`);
      throw execError;
    }
    
  } catch (error) {
    console.error(`Error generating Nari TTS audio: ${error.message}`);
    if (error.response) {
      console.error('Nari TTS API response:', error.response.status, error.response.data);
    }
    throw error;
  }
}

// Helper function to download audio from URL
async function downloadAudio(url, outputPath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(outputPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download audio: ${response.statusCode} ${response.statusMessage}`));
        return;
      }
      
      pipeline(response, fileStream)
        .then(() => {
          console.log(`Audio downloaded to ${outputPath}`);
          resolve(outputPath);
        })
        .catch(err => {
          console.error(`Error saving audio file: ${err}`);
          reject(err);
        });
    }).on('error', (err) => {
      console.error(`Error requesting audio: ${err}`);
      reject(err);
    });
  });
}

// Helper function to convert from milliseconds to the correct format for SRT
function formatDuration(milliseconds) {
  const totalSeconds = milliseconds / 1000;
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  const ms = Math.floor((totalSeconds % 1) * 1000).toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds},${ms}`;
}

export const generateAudio = async (req, res) => {
  try {
    const { dialogue, voice1, voice2, sessionId } = req.body;
    
    if (!dialogue || !voice1 || !voice2) {
      return res.status(400).json({ 
        error: 'Missing required parameters: dialogue, voice1, and voice2 are required' 
      });
    }
    
    // Generate a unique session ID if not provided
    const userSessionId = sessionId || `session-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    
    const tempDir = path.join(__dirname, '../temp', userSessionId);
    const outputDir = path.join(__dirname, '../uploads');
    const modelsDir = path.join(__dirname, '../', process.env.COQUI_MODEL_DIR || 'models');
      // Ensure directories exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`Created session-specific temp directory: ${tempDir}`);
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }
    
    // Process each line of dialogue
    const audioFiles = [];      // Map voice IDs to Mozilla TTS voices
    // Mozilla TTS voice references: https://github.com/mozilla/TTS/wiki/Released-Models
    const voiceMap = {
      'female-1': { name: 'en/vctk_low/p225', language: 'en' },  // VCTK female voice 1
      'female-2': { name: 'en/vctk_low/p236', language: 'en' },  // VCTK female voice 2
      'female-3': { name: 'en/vctk_low/p233', language: 'en' },  // Additional VCTK female voice
      'female-4': { name: 'en/vctk_low/p237', language: 'en' },  // Additional VCTK female voice
      'male-1': { name: 'en/vctk_low/p270', language: 'en' },    // VCTK male voice 1
      'male-2': { name: 'en/vctk_low/p330', language: 'en' },    // VCTK male voice 2
      'male-3': { name: 'en/vctk_low/p256', language: 'en' },    // Additional VCTK male voice
      'male-4': { name: 'en/vctk_low/p261', language: 'en' }     // Additional VCTK male voice
    };
        // Check if TTS APIs are available - prioritize Nari TTS over ElevenLabs
    let useNariTTS = false;
    let useElevenLabs = false;
    
    // First check Nari TTS availability (primary choice)
    if (process.env.NARI_API_KEY) {
      try {
        // Test Nari TTS API connection
        await axios({
          method: 'get',
          url: `${NARI_TTS_API_URL.replace('/tts', '/voices')}`,
          headers: {
            'X-API-Key': process.env.NARI_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        });
        
        useNariTTS = true;
        console.log('Nari TTS API key found and verified - using Nari TTS for text-to-speech');
      } catch (nariCheckError) {
        console.warn(`Nari TTS service check failed: ${nariCheckError.message}`);
        useNariTTS = false;
      }
    }
    
    // Only check ElevenLabs if Nari TTS is not available
    if (!useNariTTS && process.env.ELEVENLABS_API_KEY) {
      try {
        // Do a quick check if ElevenLabs is working
        await axios({
          method: 'get',
          url: `${ELEVENLABS_API_URL}/voices`,
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        });
        
        // If we get here, ElevenLabs is working
        useElevenLabs = true;
        console.log('ElevenLabs API connectivity verified - using as fallback');
      } catch (elevenLabsCheckError) {
        console.warn(`ElevenLabs service check failed: ${elevenLabsCheckError.message}`);
        useElevenLabs = false;
      }
    }
    
    if (useNariTTS) {
      console.log('Using Nari TTS API for text-to-speech');
    } else if (useElevenLabs) {
      console.log('Using ElevenLabs API for text-to-speech');
    } else {
      console.log('No TTS API keys set, falling back to Mozilla TTS or local TTS');
    }
      
    // Mozilla TTS API endpoint - using their public service or from env
    const mozillaTTSEndpoint = process.env.MOZILLA_TTS_ENDPOINT || 'https://tts.mozilla.org/api/v1/tts';
    
    // Check if Mozilla TTS service is available (only if not using Nari TTS)
    let isMozillaTTSAvailable = false;
    if (!useNariTTS) {
      try {
        const mozillaTTSStatusEndpoint = mozillaTTSEndpoint.replace('/tts', '/status');
        const response = await axios.get(mozillaTTSStatusEndpoint, { timeout: 5000 });
        console.log('Mozilla TTS service status:', response.data);
        isMozillaTTSAvailable = true;
      } catch (error) {
        console.warn('Mozilla TTS service unavailable:', error.message);
        console.log('Will use local fallback TTS for each operating system:');
        console.log('- Windows: PowerShell Speech Synthesis');
        console.log('- macOS: say command');
        console.log('- Linux: espeak');
      }
    }
      // Generate audio for each line
    for (const [index, line] of dialogue.entries()) {
      // Determine which voice to use based on the speaker
      // Use different voices even if the user selected the same voice type
      // to ensure characters sound distinct from each other
      let voiceId;
      if (line.speaker === 'Nina') {
        // For Nina, use the selected voice or a female voice
        if (voice1.startsWith('female-')) {
          voiceId = voice1;
        } else if (voice1.startsWith('male-')) {
          // If male voice was selected for Nina, use female-3 as an alternative
          voiceId = 'female-3';
        } else {
          voiceId = 'female-1';
        }
      } else {
        // For other character, use the selected voice or a male voice
        if (voice2.startsWith('male-')) {
          voiceId = voice2; 
        } else if (voice2.startsWith('female-')) {
          // If female voice was selected for the other character, use male-3 as an alternative
          voiceId = 'male-3';
        } else {
          voiceId = 'male-1';
        }
      }
      
      // For Mozilla TTS fallback
      const mozillaVoice = voiceMap[voiceId] || voiceMap['female-1'];  // Fallback to default voice
        console.log(`Generating audio for ${line.speaker} using voice ${voiceId}`);
      
      // Generate output filename with session ID to prevent mixups
      const outputFile = path.join(tempDir, `line_${userSessionId}_${index + 1}.wav`);
      try {
        console.log(`Generating audio for line ${index + 1}`);
        
        if (useNariTTS) {          
          try {
            // Generate audio using Nari TTS with the specific voice ID
            const audioFilePath = await generateNariAudio(line.text, line.speaker, voiceId);
            
            // Copy the audio file to our expected output path
            fs.copyFileSync(audioFilePath, outputFile);
            
            // Remove the temporary file
            fs.unlinkSync(audioFilePath);
            console.log(`Nari TTS audio generated for line ${index + 1}`);
          } catch (nariError) {
            console.error(`Nari TTS API error: ${nariError.message}. Trying fallbacks...`);
            
            // Try ElevenLabs if available as fallback
            if (useElevenLabs) {
              try {
                const audioFilePath = await generateElevenLabsAudio(line.text, voiceId);
                fs.copyFileSync(audioFilePath, outputFile);
                fs.unlinkSync(audioFilePath);
              } catch (elevenLabsError) {
                console.error(`ElevenLabs fallback also failed: ${elevenLabsError.message}`);
                if (isMozillaTTSAvailable) {
                  await useMozillaTTS(line.text, mozillaVoice, outputFile, mozillaTTSEndpoint);
                } else {
                  await useLocalTTS(line.text, outputFile);
                }
              }
            } else if (isMozillaTTSAvailable) {
              await useMozillaTTS(line.text, mozillaVoice, outputFile, mozillaTTSEndpoint);
            } else {
              await useLocalTTS(line.text, outputFile);
            }
          }
        } else if (useElevenLabs) {
          try {
            // Generate audio using ElevenLabs with the specific voice ID
            const audioFilePath = await generateElevenLabsAudio(line.text, voiceId);
            
            // ElevenLabs returns an MP3 file directly, so we can just use it
            console.log(`ElevenLabs audio generated for line ${index + 1}`);
            
            // Move or copy the file to our expected output path
            fs.copyFileSync(audioFilePath, outputFile);
            
            // Remove the temporary file
            fs.unlinkSync(audioFilePath);
          } catch (elevenLabsError) {
            console.error(`ElevenLabs API error: ${elevenLabsError.message}. Trying fallbacks...`);
            
            // If ElevenLabs fails, try Mozilla TTS or local fallback
            if (isMozillaTTSAvailable) {
              await useMozillaTTS(line.text, mozillaVoice, outputFile, mozillaTTSEndpoint);
            } else {
              await useLocalTTS(line.text, outputFile);
            }
          }
        } else if (isMozillaTTSAvailable) {
          // Use Mozilla TTS
          await useMozillaTTS(line.text, mozillaVoice, outputFile, mozillaTTSEndpoint);
        } else {
          // Use local fallback
          await useLocalTTS(line.text, outputFile);
        }
        
        // Function for Mozilla TTS
        async function useMozillaTTS(text, voice, outputPath, endpoint) {
          // Use the Mozilla TTS direct API
          const params = new URLSearchParams({
            text: text,
            voice: voice.name,
            lang: voice.language
          });
          
          const ttsUrl = `${endpoint}?${params.toString()}`;
          const fileStream = fs.createWriteStream(outputPath);
          
          console.log(`Using Mozilla TTS API with voice ${voice.name}...`);
          
          // Download the audio file
          return new Promise((resolve, reject) => {
            https.get(ttsUrl, (response) => {
              if (response.statusCode !== 200) {
                reject(new Error(`Failed to fetch audio: ${response.statusCode} ${response.statusMessage}`));
                return;
              }
              
              pipeline(response, fileStream)
                .then(() => {
                  console.log(`Mozilla TTS audio synthesized for line ${index + 1}`);
                  resolve();
                })
                .catch(err => {
                  console.error(`Error saving Mozilla TTS audio file: ${err}`);
                  reject(err);
                });
            }).on('error', (err) => {
              console.error(`Error requesting Mozilla TTS: ${err}`);
              reject(err);
            });
          });
        }
          // Function for local TTS fallback
        async function useLocalTTS(text, outputPath) {
          const { execSync } = await import('child_process');
          
          try {
            if (process.platform === 'win32') {
              // Using PowerShell's speech synthesis on Windows
              console.log('Using Windows Speech Synthesis...');
              // Properly escape all special characters for PowerShell
              const escapedText = text
                .replace(/"/g, '\\"')        // Double quotes
                .replace(/[\\]/g, '\\\\')    // Backslashes
                .replace(/'/g, "''")         // Single quotes (PowerShell uses '' to escape ')
                .replace(/`/g, '``')         // Backticks
                .replace(/\$/g, '`$')        // Dollar signs
                .replace(/\r?\n/g, ' ');     // Newlines
                
              execSync(`powershell -c "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.SetOutputToWaveFile('${outputPath.replace(/\\/g, '\\\\')}'); $synth.Speak('${escapedText}'); $synth.Dispose()"`);
            } else if (process.platform === 'darwin') {
              // Using say on macOS
              console.log('Using macOS Say command...');
              execSync(`say -o "${outputPath}" "${text.replace(/"/g, '\\"')}"`);
            } else {
              // Linux - check if espeak is available
              try {
                execSync('which espeak', { stdio: 'ignore' });
                console.log('Using Linux eSpeak...');
                execSync(`espeak -v en-us -s 150 -p 50 -a 200 -g 10 "${text.replace(/"/g, '\\"')}" -w "${outputPath}"`);
              } catch (whichError) {
                // espeak not found, create a simple silent audio file using FFmpeg
                console.log('espeak not found, creating silent audio as fallback');
                const { createSilentAudio } = await import('../utils/ffmpegUtils.js');
                await createSilentAudio(outputPath, 3); // 3 second silent audio
              }
            }
            console.log(`Local TTS generated for line ${index + 1}`);
          } catch (error) {
            console.error(`Local TTS failed: ${error.message}`);
            // Final fallback - create silent audio
            const { createSilentAudio } = await import('../utils/ffmpegUtils.js');
            await createSilentAudio(outputPath, 3);
          }
        }
        
        // Convert wav to mp3 for consistency with previous implementation
        const mp3OutputFile = outputFile.replace('.wav', '.mp3');
          try {
          console.log('Converting WAV to MP3 using fluent-ffmpeg...');
          
          try {
            // Use our new convertAudio utility function
            await convertAudio(outputFile, mp3OutputFile, {
              codec: 'libmp3lame',
              quality: 2
            });
            
            // Check if MP3 file was created and has content
            if (fs.existsSync(mp3OutputFile) && fs.statSync(mp3OutputFile).size > 0) {
              // Remove the WAV file to save space only after successful conversion
              fs.unlinkSync(outputFile);
              console.log(`Successfully converted to MP3: ${mp3OutputFile}`);
            } else {
              throw new Error('FFmpeg completed but output file is missing or empty');
            }
          } catch (ffmpegError) {
            console.error(`FFmpeg error details: ${ffmpegError.message}`);
            throw ffmpegError; // Re-throw to be caught by the outer catch block
          }
        } catch (conversionError) {
          console.error(`FFmpeg conversion failed: ${conversionError.message}`);
          // If MP3 conversion fails, use the WAV file instead
          console.log('Using WAV file as fallback...');
          audioFiles.push({
            path: outputFile,  // Use the WAV file instead
            startTime: index * 5,
            endTime: (index + 1) * 5,
            speaker: line.speaker,
            text: line.text
          });
          
          // Continue to the next iteration - don't return from here
          continue;
        }
        
        console.log(`Audio generation completed for line ${index + 1}`);
        
        // Add the file info to the list
        audioFiles.push({
          path: mp3OutputFile,
          startTime: index * 5,
          endTime: (index + 1) * 5,
          speaker: line.speaker,
          text: line.text
        });
      } catch (error) {
        console.error(`Error generating audio for line ${index + 1}:`, error);
        // Instead of completely failing, let's try to create a silent audio file as fallback
        try {
          console.log(`Creating fallback silent audio for line ${index + 1}`);
            // Import the createSilentAudio utility
          const { createSilentAudio } = await import('../utils/audioUtils.js');
          
          // Create a 2-second silent audio file with session ID to prevent conflicts
          const silentFilePath = path.join(tempDir, `silent_${userSessionId}_${index + 1}.wav`);
          await createSilentAudio(silentFilePath, 2, path.join(__dirname, '..'));
          
          // Add this silent file to our audio files
          audioFiles.push({
            path: silentFilePath,
            startTime: index * 5,
            endTime: (index * 5) + 2,
            speaker: line.speaker,
            text: line.text
          });
          
          console.log(`Created silent fallback for line ${index + 1}`);
        } catch (fallbackError) {
          console.error(`Failed to create silent audio fallback: ${fallbackError.message}`);
          // If even that fails, just skip this line
        }
      }
    }    // End of the dialogue processing loop
    
    // Generate a timestamp for the final file
    const timestamp = Date.now();
    const mergedAudioFilename = `merged_audio_${userSessionId}_${timestamp}.mp3`;
    const mergedAudioPath = path.join(outputDir, mergedAudioFilename);
    
    // Generate SRT file for subtitles
    const srtFilename = `dialogue_${userSessionId}_${timestamp}.srt`;
    const srtFilePath = path.join(outputDir, srtFilename);
    
    let srtContent = '';
    let totalDuration = 0;
    
    // Create a more accurate timing for the subtitles
    // We'll use our audio utility to get the actual duration of each audio file
    // Import the getAudioDuration utility
    const { getAudioDuration } = await import('../utils/audioUtils.js');
    
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
        try {
        // Get audio duration using our utility function
        const duration = await getAudioDuration(file.path, path.join(__dirname, '..'));
        
        // Update timing
        file.startTime = totalDuration;
        file.endTime = totalDuration + duration;
        totalDuration += duration;
        
        // Add small pause between lines (0.5 seconds)
        totalDuration += 0.5;
        
      } catch (error) {
        console.error(`Error getting duration for ${file.path}:`, error);
        // Use fallback timing if ffprobe fails
        file.startTime = i * 5;
        file.endTime = (i + 1) * 5;
      }
      
      // Add to SRT content
      const startTime = formatSRTTime(file.startTime);
      const endTime = formatSRTTime(file.endTime);
      
      srtContent += `${i + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${file.speaker}: ${file.text}\n\n`;
    }
    // Write the SRT file
    fs.writeFileSync(srtFilePath, srtContent);
      // Import the new fluent-ffmpeg concat utility
    const { concatenateAudioFiles } = await import('../utils/ffmpegConcatUtils.js');
    
    // Check if we have any files to concatenate
    if (audioFiles.length === 0) {
      return res.status(500).json({
        error: 'Failed to generate audio',
        details: 'No audio files were generated successfully'
      });
    }
      // Use our audio concatenation utility
    try {
      // Pass the necessary parameters to the concatenation utility
      await concatenateAudioFiles(audioFiles, mergedAudioPath);
      
      // Clean up temporary files - the individual audio files
      try {
        for (const file of audioFiles) {
          fs.unlinkSync(file.path);
        }
        console.log('Temporary audio files cleaned up');
      } catch (cleanupError) {
        console.error('Error cleaning up temporary files:', cleanupError);
        // Non-critical error, continue
      }
    } catch (concatError) {
      console.error(`Error during audio concatenation process: ${concatError.message}`);
      throw concatError;
    }
    
    // Return the paths to the merged audio and subtitle files
    return res.status(200).json({
      success: true,
      audioPath: mergedAudioFilename,
      subtitlePath: srtFilename,
      message: 'Audio generated successfully'
    });
    
  } catch (error) {
    console.error('Error generating audio:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Failed to generate audio', 
      details: error.message 
    });
  }
};

// Helper function to format time for SRT files
function formatSRTTime(seconds) {
  return formatDuration(seconds * 1000);
}
