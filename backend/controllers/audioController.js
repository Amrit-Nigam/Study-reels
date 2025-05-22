import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fsExtra from 'fs-extra';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    }    // Process each line of dialogue
    const audioFiles = [];
    
    // Map voice IDs to Azure voice names
    const voiceMap = {
      'female-1': 'en-US-JennyNeural',
      'female-2': 'en-US-AriaNeural',
      'male-1': 'en-US-GuyNeural',
      'male-2': 'en-US-DavisNeural'
    };
    
    // Generate audio for each line using Azure TTS
    for (const [index, line] of dialogue.entries()) {
      // Determine which voice to use
      const voiceId = line.speaker === 'Nina' ? voice1 : voice2;
      const azureVoice = voiceMap[voiceId] || 'en-US-JennyNeural';  // Fallback to default voice
      
      console.log(`Generating audio for ${line.speaker} using voice ${azureVoice}`);
      
      // Generate output filename
      const outputFile = path.join(tempDir, `line_${index + 1}.wav`);
      
      try {
        // Generate audio using Microsoft Azure TTS
        console.log(`Generating audio for line ${index + 1}`);
        
        // Create the speech configuration
        const speechConfig = sdk.SpeechConfig.fromSubscription(
          process.env.SPEECH_KEY, 
          process.env.SPEECH_REGION
        );
        
        // Set the output format
        speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;
        
        // Set the voice
        speechConfig.speechSynthesisVoiceName = azureVoice;
        
        // Create an audio configuration for file output
        const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputFile);
        
        // Create a speech synthesizer
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
        
        // Generate audio
        await new Promise((resolve, reject) => {
          synthesizer.speakTextAsync(
            line.text,
            result => {
              synthesizer.close();
              if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                console.log(`Audio synthesized for line ${index + 1}`);
                resolve();
              } else {
                const error = `Error synthesizing audio: ${result.errorDetails}`;
                console.error(error);
                reject(new Error(error));
              }
            },
            error => {
              synthesizer.close();
              console.error(`Error synthesizing audio: ${error}`);
              reject(error);
            }
          );
        });
        
        // Convert wav to mp3 for consistency with previous implementation
        const mp3OutputFile = outputFile.replace('.wav', '.mp3');
        const { execSync } = await import('child_process');
        execSync(`ffmpeg -i "${outputFile}" -codec:a libmp3lame -qscale:a 2 "${mp3OutputFile}" -y`);
        
        // Remove the WAV file to save space
        fs.unlinkSync(outputFile);
        
        console.log(`Audio generation completed for line ${index + 1}`);
        
        // Update the outputFile to point to the mp3 version
        audioFiles.push({
          path: mp3OutputFile,
          startTime: index * 5,
          endTime: (index + 1) * 5,
          speaker: line.speaker,
          text: line.text
        });
      } catch (error) {
        console.error(`Error generating audio for line ${index + 1}:`, error);
        throw error;      }
    }
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
    // We'll use ffmpeg to get the actual duration of each audio file
    const { execSync } = await import('child_process');
    
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      
      try {
        // Get audio duration using ffmpeg
        const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file.path}"`;
        const duration = parseFloat(execSync(durationCmd).toString().trim());
        
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
    
    // Concatenate all audio files using ffmpeg
    console.log('Concatenating audio files...');
    
    // Create a file list for ffmpeg
    const fileListPath = path.join(tempDir, `filelist_${timestamp}.txt`);
    let fileListContent = '';
    
    audioFiles.forEach(file => {
      fileListContent += `file '${file.path.replace(/\\/g, '/')}'\n`;
    });
    
    fs.writeFileSync(fileListPath, fileListContent);
    
    // Run ffmpeg to concatenate the files
    const { exec } = await import('child_process');
    
    await new Promise((resolve, reject) => {
      exec(`ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy "${mergedAudioPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error concatenating audio files: ${error.message}`);
          reject(error);
          return;
        }
        console.log('Audio files concatenated successfully');
        resolve();
      });
    });
      // Clean up temporary files
    try {
      // Remove individual audio files
      for (const file of audioFiles) {
        fs.unlinkSync(file.path);
      }
      
      // Remove the file list
      fs.unlinkSync(fileListPath);
      
      console.log('Temporary files cleaned up');
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
      // Non-critical error, continue
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
