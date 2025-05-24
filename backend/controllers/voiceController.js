import dotenv from 'dotenv';

dotenv.config();

export const getAvailableVoices = (req, res) => {
  try {
    // Map of available voices with their descriptions
    const availableVoices = {
      // Female voices
      'female-1': {
        id: 'female-1',
        name: 'Lively Girl',
        description: 'Energetic and youthful female voice',
        gender: 'female',
        speedFactor: 1.2,
        pitch: 2
      },
      'female-2': {
        id: 'female-2',
        name: 'Sweet Girl',
        description: 'Soft and gentle female voice',
        gender: 'female',
        speedFactor: 1.15,
        pitch: -1
      },
      'female-3': {
        id: 'female-3',
        name: 'Calm Woman',
        description: 'Mature and soothing female voice',
        gender: 'female',
        speedFactor: 1.25,
        pitch: 1
      },
      'female-4': {
        id: 'female-4',
        name: 'Abbess',
        description: 'Authoritative female voice',
        gender: 'female',
        speedFactor: 1.2,
        pitch: 0
      },
      
      // Male voices
      'male-1': {
        id: 'male-1',
        name: 'Deep Voice Man',
        description: 'Deep and resonant male voice',
        gender: 'male',
        speedFactor: 1.15,
        pitch: -2
      },
      'male-2': {
        id: 'male-2',
        name: 'Casual Guy',
        description: 'Relaxed and friendly male voice',
        gender: 'male',
        speedFactor: 1.2,
        pitch: 0
      },
      'male-3': {
        id: 'male-3',
        name: 'Elegant Man',
        description: 'Refined and articulate male voice',
        gender: 'male',
        speedFactor: 1.1,
        pitch: 1
      },
      'male-4': {
        id: 'male-4',
        name: 'Imposing Manner',
        description: 'Commanding and powerful male voice',
        gender: 'male',
        speedFactor: 1.15,
        pitch: -1
      }
    };
    
    // Check if TTS APIs are available
    const isFalAvailable = !!process.env.FAL_KEY;
    const isElevenLabsAvailable = !!process.env.ELEVENLABS_API_KEY;
    
    // Return available voices with API status
    return res.status(200).json({
      success: true,
      voices: availableVoices,
      apiStatus: {
        falAi: isFalAvailable ? 'available' : 'unavailable',
        elevenLabs: isElevenLabsAvailable ? 'available' : 'unavailable'
      }
    });
    
  } catch (error) {
    console.error('Error getting available voices:', error.message);
    return res.status(500).json({
      error: 'Failed to get available voices',
      details: error.message
    });
  }
};
