import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { getAvailableVoices, VoiceOption } from '@/services/voiceService';

// Define types for our components
interface DialogueLine {
  speaker: string;
  text: string;
}

// Default voice options as fallback
const DEFAULT_VOICE_OPTIONS: VoiceOption[] = [
  { id: 'female-1', name: 'Female Voice 1', description: 'Default female voice', gender: 'female', speedFactor: 1, pitch: 0 },
  { id: 'female-2', name: 'Female Voice 2', description: 'Alternative female voice', gender: 'female', speedFactor: 1, pitch: 0 },
  { id: 'male-1', name: 'Male Voice 1', description: 'Default male voice', gender: 'male', speedFactor: 1, pitch: 0 },
  { id: 'male-2', name: 'Male Voice 2', description: 'Alternative male voice', gender: 'male', speedFactor: 1, pitch: 0 },
];

export const VideoGenerator = () => {  
  const [topic, setTopic] = useState('');  
  const [voice1, setVoice1] = useState('female-1');
  const [voice2, setVoice2] = useState('male-1');
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>(DEFAULT_VOICE_OPTIONS);
  const [gameplayVideo, setGameplayVideo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [dialogue, setDialogue] = useState<DialogueLine[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVoiceApiAvailable, setIsVoiceApiAvailable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch available voices when component mounts
  useEffect(() => {
    async function loadVoices() {
      try {
        const voices = await getAvailableVoices();
        if (voices && voices.length > 0) {
          setVoiceOptions(voices);
          setIsVoiceApiAvailable(true);
          
          // Set default voices - female for Nina, male for Jay
          const defaultFemale = voices.find(v => v.gender === 'female')?.id || 'female-1';
          const defaultMale = voices.find(v => v.gender === 'male')?.id || 'male-1';
          setVoice1(defaultFemale);
          setVoice2(defaultMale);
        }
      } catch (error) {
        console.error('Failed to load voice options:', error);
        toast.error('Failed to load voice options, using defaults');
      }
    }
    
    loadVoices();
  }, []);

  const steps = [
    'Enter Topic',
    'Select Voices',
    'Choose Gameplay',
    'Generate Video'
  ];
  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value);
  };

  const handleVoice1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVoice1(e.target.value);
  };

  const handleVoice2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVoice2(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.includes('video')) {
      setGameplayVideo(file);
    } else {
      toast.error('Please select a valid video file');
    }
  };

  const handleGenerateScript = async () => {
    if (!topic) {
      toast.error('Please enter a topic');
      return;
    }    setLoading(true);
    toast.info('Generating script...');  try {
      // Use proxy URL to bypass CORS
      const apiUrl = '/api/video/generate-script';
      console.log('Calling API at:', apiUrl);
      
      const response = await axios({
        method: 'post',
        url: apiUrl,
        data: { topic },
        timeout: 120000, // 2 minutes timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.data.success) {
        setDialogue(response.data.dialogue);
        toast.success('Script generated successfully!');
        setCurrentStep(1); // Move to voice selection      } else {
        toast.error('Failed to generate script');
      }    } catch (error: any) { // Type assertion for error
      console.error('Error generating script:', error);
      
      // Try the fallback route
      try {
        console.log('Trying fallback route...');
        const fallbackResponse = await axios({
          method: 'post',
          url: '/api/fallback/generate-script',
          data: { topic },
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (fallbackResponse.data.success) {
          setDialogue(fallbackResponse.data.dialogue);
          toast.warning('Using fallback script due to connection issues.', {
            duration: 5000
          });
          setCurrentStep(1); // Move to voice selection
          return;
        }
      } catch (fallbackError) {
        console.error('Fallback route also failed:', fallbackError);
      }
      
      // Create local fallback dialogue as last resort
      const fallbackDialogue = [
        { "speaker": "Nina", "text": `Let's talk about ${topic}. It's a fascinating subject!` },
        { "speaker": "Jay", "text": "I'd love to learn more about it." },
        { "speaker": "Nina", "text": "What specific aspects are you interested in?" },
        { "speaker": "Jay", "text": "Maybe you could start with the basics?" },
        { "speaker": "Nina", "text": `Sure! The key things to understand about ${topic} are...` }
      ];
      
      setDialogue(fallbackDialogue);
      toast.warning('Network issue detected. Using a basic script template. You can continue or try again.', {
        duration: 5000
      });
      setCurrentStep(1); // Move to voice selection despite error
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!topic || !voice1 || !voice2 || !gameplayVideo) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    toast.info('Processing your request...');

    const formData = new FormData();
    formData.append('topic', topic);
    formData.append('voice1', voice1);
    formData.append('voice2', voice2);
    formData.append('gameplayVideo', gameplayVideo);

    try {      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/video/create`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 600000, // 10 minutes timeout for large files
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        }
      );

      if (response.data.success) {
        const fullVideoUrl = `${import.meta.env.VITE_SERVER_URL}${response.data.videoUrl}`;
        setVideoUrl(fullVideoUrl);
        toast.success('Video generated successfully!');
      } else {
        toast.error('Failed to generate video');
      }    } catch (error: any) {
      console.error('Error generating video:', error);
      toast.error(`Error: ${error.response?.data?.error || 'Failed to generate video'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      handleGenerateScript();
    } else if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerateVideo();
    }
  };
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    // Reset all state to initial values
    setTopic('');
    setDialogue([]);
    setGameplayVideo(null);
    setVideoUrl('');
    setCurrentStep(0);
    
    // Reset voice options to defaults if needed
    const defaultFemale = voiceOptions.find(v => v.gender === 'female')?.id || 'female-1';
    const defaultMale = voiceOptions.find(v => v.gender === 'male')?.id || 'male-1';
    setVoice1(defaultFemale);
    setVoice2(defaultMale);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    toast.info('Ready to create a new video!');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Enter a topic for your video
            </label>            <input
              type="text"
              value={topic}
              onChange={handleTopicChange}
              placeholder="e.g., Pokémon facts, space exploration, coffee brewing"
              className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              disabled={loading}
            />
          </div>
        );
        case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Voice for Nina
              </label>              <select
                value={voice1}
                onChange={handleVoice1Change}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={loading}
              >
                {voiceOptions
                  .filter((v: VoiceOption) => v.gender === 'female')
                  .map((voice: VoiceOption) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))
                }
              </select>
              {isVoiceApiAvailable && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Using enhanced FAL.ai voices for better quality
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Voice for Jay
              </label>              <select
                value={voice2}
                onChange={handleVoice2Change}
                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={loading}
              >
                {voiceOptions
                  .filter((v: VoiceOption) => v.gender === 'male')
                  .map((voice: VoiceOption) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))
                }
              </select>
              {isVoiceApiAvailable && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Using enhanced FAL.ai voices for better quality
                </p>
              )}
            </div>{dialogue.length > 0 && (
              <div className="mt-6 p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Generated Dialogue:</h3>
                <div className="space-y-2">
                  {dialogue.map((line, index) => (
                    <p key={index} className="text-gray-800 dark:text-gray-200">
                      <span className="font-bold text-blue-600 dark:text-blue-400">{line.speaker}:</span> {line.text}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Upload gameplay video
            </label>            <div className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/30">
              <input
                type="file"
                onChange={handleFileChange}
                accept="video/*"
                className="hidden"
                ref={fileInputRef}
                disabled={loading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                Select Video File
              </button>
              {gameplayVideo && (
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Selected: <span className="font-medium">{gameplayVideo.name}</span>
                </p>
              )}
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">            <div className="p-5 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Summary:</h3>                <div className="space-y-2">
                <p className="text-gray-800 dark:text-gray-200"><span className="font-semibold text-gray-900 dark:text-gray-100">Topic:</span> {topic}</p>
                <p className="text-gray-800 dark:text-gray-200"><span className="font-semibold text-gray-900 dark:text-gray-100">Voice for Nina:</span> {voiceOptions.find((v: VoiceOption) => v.id === voice1)?.name}</p>
                <p className="text-gray-800 dark:text-gray-200"><span className="font-semibold text-gray-900 dark:text-gray-100">Voice for Jay:</span> {voiceOptions.find((v: VoiceOption) => v.id === voice2)?.name}</p>
                <p className="text-gray-800 dark:text-gray-200"><span className="font-semibold text-gray-900 dark:text-gray-100">Gameplay video:</span> {gameplayVideo?.name}</p>
              </div>
            </div>
              {videoUrl && (
              <div className="mt-6">
                <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Generated Video:</h3>
                <div className="aspect-video bg-black rounded-md overflow-hidden shadow-lg">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full"
                    poster="/placeholder-video.png"
                  />
                </div>                <a
                  href={videoUrl}
                  download
                  className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 mr-2"
                >
                  Download Video
                </a>
                <button
                  onClick={handleReset}
                  className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  Create New Video
                </button>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };
  return (
    <div className="container mx-auto p-6 max-w-3xl">      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        <span className="mr-2">🧠</span>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
          Brainrot Video Generator
        </span>
      </h1>      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Powered by <span className="font-medium">ElevenLabs</span> advanced voice technology
      </p>
      
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between mb-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex-1 text-center ${
                index < currentStep 
                  ? 'text-green-600 dark:text-green-400'
                  : index === currentStep 
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          ></div>
        </div>
      </div>      
      {/* Step Content */}
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-6 mb-6 bg-white dark:bg-gray-850 shadow-sm">
        {renderStepContent()}
      </div>
        {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          onClick={handleBack}
          disabled={currentStep === 0 || loading}
          variant="outline"
          className="transition-all duration-200"
        >
          Back
        </Button>
        
        {/* New button for resetting/creating a new video */}
        {videoUrl && (
          <Button
            onClick={handleReset}
            variant="secondary"
            className="transition-all duration-200 mx-2"
          >
            New Video
          </Button>
        )}
        
        <Button
          onClick={handleNext}
          disabled={loading}
          className="transition-all duration-200"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            currentStep === steps.length - 1 ? 'Generate Video' : 'Next'
          )}
        </Button>
      </div>
    </div>
  );
};

export default VideoGenerator;
