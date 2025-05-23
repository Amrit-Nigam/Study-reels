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
import { fal } from '@fal-ai/client';

const pipeline = promisify(pipelineCallback);
dotenv.config();

// Configure fal.ai client if FAL_KEY is set
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to get the ffmpeg command path
function getFFmpegPath() {
  // Check if ffmpeg exists locally in the backend directory
  const localFFmpeg = path.join(__dirname, '../ffmpeg.exe');
  if (fs.existsSync(localFFmpeg)) {
    console.log('Using local FFmpeg executable from backend directory');
    return localFFmpeg;
  }
  
  // Fallback to system PATH
  return 'ffmpeg';
}

// Helper function to generate audio using FAL.ai API
async function generateFalAudio(text, speaker, voiceId) {
  try {
    if (!process.env.FAL_KEY) {
      throw new Error('FAL_KEY environment variable not set');
    }
    
    console.log(`Generating audio with FAL.ai for ${speaker} using voice ${voiceId}`);
      // Map voice IDs to MiniMax voice settings with a wider variety
    const voiceSettings = {
      'female-1': {
        voice_id: 'Lively_Girl',
        speed: 1.2,
        pitch: 2
      },
      'female-2': {
        voice_id: 'Sweet_Girl_2',
        speed: 1.15,
        pitch: -1
      },
      'female-3': {
        voice_id: 'Calm_Woman',
        speed: 1.25,
        pitch: 1
      },
      'female-4': {
        voice_id: 'Abbess',
        speed: 1.2,
        pitch: 0
      },
      'male-1': {
        voice_id: 'Deep_Voice_Man',
        speed: 1.15,
        pitch: -2
      },
      'male-2': {
        voice_id: 'Casual_Guy',
        speed: 1.2,
        pitch: 0
      },
      'male-3': {
        voice_id: 'Elegant_Man',
        speed: 1.1,
        pitch: 1
      },
      'male-4': {
        voice_id: 'Imposing_Manner',
        speed: 1.15,
        pitch: -1
      }
    };
      // Get voice settings based on voiceId or use default
    const voiceSetting = voiceSettings[voiceId] || {
      voice_id: speaker.toLowerCase().includes('nina') ? 'Lively_Girl' : 'Deep_Voice_Man',
      speed: 1.2,
      pitch: 0
    };
    
    // Call the fal.ai API with voice settings
    const result = await fal.subscribe("fal-ai/minimax/speech-02-turbo", {
      input: {
        text: text,
        output_format: "hex",
        voice_setting: {
          voice_id: voiceSetting.voice_id,
          speed: voiceSetting.speed,
          pitch: voiceSetting.pitch,
          vol: 1 // Default volume
        }
      },
      logs: true,
    });
    
    if (!result.data || !result.data.audio || !result.data.audio.url) {
      throw new Error('Failed to get audio URL from FAL.ai API');
    }
    
    console.log(`FAL.ai audio generated for ${speaker} with voice ${voiceSetting.voice_id}, duration: ${result.data.duration_ms}ms`);
    return result.data.audio.url;
  } catch (error) {
    console.error(`Error generating FAL.ai audio: ${error.message}`);
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
    const { dialogue, voice1, voice2 } = req.body;
    
    if (!dialogue || !voice1 || !voice2) {
      return res.status(400).json({ 
        error: 'Missing required parameters: dialogue, voice1, and voice2 are required' 
      });
    }
    
    const tempDir = path.join(__dirname, '../temp');
    const outputDir = path.join(__dirname, '../uploads');
    const modelsDir = path.join(__dirname, '../', process.env.COQUI_MODEL_DIR || 'models');
    
    // Ensure directories exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }
    
    // Process each line of dialogue
    const audioFiles = [];
      // Map voice IDs to Mozilla TTS voices
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
    
    // Check if FAL.ai API is available
    const useFalAi = !!process.env.FAL_KEY;
    if (useFalAi) {
      console.log('Using FAL.ai API for text-to-speech');
    } else {
      console.log('FAL_KEY not set, falling back to Mozilla TTS or local TTS');
    }
      
    // Mozilla TTS API endpoint - using their public service or from env
    const mozillaTTSEndpoint = process.env.MOZILLA_TTS_ENDPOINT || 'https://tts.mozilla.org/api/v1/tts';
    
    // Check if Mozilla TTS service is available (only if not using FAL.ai)
    let isMozillaTTSAvailable = false;
    if (!useFalAi) {
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
      
      // Generate output filename
      const outputFile = path.join(tempDir, `line_${index + 1}.wav`);
      
      try {
        console.log(`Generating audio for line ${index + 1}`);
        
        if (useFalAi) {          try {
            // Generate audio using FAL.ai with the specific voice ID
            const audioUrl = await generateFalAudio(line.text, line.speaker, voiceId);
            
            // Download the audio file
            await downloadAudio(audioUrl, outputFile);
            console.log(`FAL.ai audio downloaded for line ${index + 1}`);
          } catch (falError) {
            console.error(`FAL.ai API error: ${falError.message}. Falling back to alternate TTS...`);
            
            // If FAL.ai fails, try Mozilla TTS or local fallback
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
            // Using espeak on Linux with enhanced quality parameters
            console.log('Using Linux eSpeak...');
            execSync(`espeak -v en-us -s 150 -p 50 -a 200 -g 10 "${text.replace(/"/g, '\\"')}" -w "${outputPath}"`);
          }
          console.log(`Local TTS generated for line ${index + 1}`);
        }
        
        // Convert wav to mp3 for consistency with previous implementation
        const mp3OutputFile = outputFile.replace('.wav', '.mp3');
        
        try {
          const { execSync } = await import('child_process');
          console.log('Converting WAV to MP3 using FFmpeg...');
          
          // Check if ffmpeg.exe exists in the backend folder first
          let ffmpegCmd = getFFmpegPath();
          
          try {
            console.log(`Running FFmpeg command: ${ffmpegCmd} -i "${outputFile}" -codec:a libmp3lame -qscale:a 2 "${mp3OutputFile}" -y`);
            const result = execSync(`${ffmpegCmd} -i "${outputFile}" -codec:a libmp3lame -qscale:a 2 "${mp3OutputFile}" -y`, { encoding: 'utf8' });
            
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
          
          // Create a 2-second silent audio file
          const silentFilePath = path.join(tempDir, `silent_${index + 1}.wav`);
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
    }
    // End of the dialogue processing loop
    
    // Generate a timestamp for the final file
    const timestamp = Date.now();
    const mergedAudioFilename = `merged_audio_${timestamp}.mp3`;
    const mergedAudioPath = path.join(outputDir, mergedAudioFilename);
    
    // Generate SRT file for subtitles
    const srtFilename = `dialogue_${timestamp}.srt`;
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
      // Import the new concat-only utility
    const { concatenateAudioFiles } = await import('../utils/audioUtils.concat.js');
    
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
      await concatenateAudioFiles(audioFiles, mergedAudioPath, tempDir, path.join(__dirname, '..'));
      
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
