import axios from 'axios';

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  speedFactor: number;
  pitch: number;
}

export interface VoiceApiResponse {
  success: boolean;
  voices: Record<string, VoiceOption>;
  apiStatus: {
    falAi: 'available' | 'unavailable';
    elevenLabs: 'available' | 'unavailable';
  };
}

export const getAvailableVoices = async (): Promise<VoiceOption[]> => {
  try {
    const response = await axios.get<VoiceApiResponse>(
      `${import.meta.env.VITE_SERVER_URL}/api/voice/available`
    );
    
    if (response.data.success) {
      // Convert the voices object to an array
      const voicesArray = Object.values(response.data.voices);
      return voicesArray;
    } else {
      throw new Error('Failed to get voice options');
    }
  } catch (error) {
    console.error('Error fetching voice options:', error);
    // Return default voice options if the API call fails
    return [
      { id: 'female-1', name: 'Female Voice 1', description: 'Default female voice', gender: 'female', speedFactor: 1, pitch: 0 },
      { id: 'female-2', name: 'Female Voice 2', description: 'Alternative female voice', gender: 'female', speedFactor: 1, pitch: 0 },
      { id: 'male-1', name: 'Male Voice 1', description: 'Default male voice', gender: 'male', speedFactor: 1, pitch: 0 },
      { id: 'male-2', name: 'Male Voice 2', description: 'Alternative male voice', gender: 'male', speedFactor: 1, pitch: 0 },
    ];
  }
};
