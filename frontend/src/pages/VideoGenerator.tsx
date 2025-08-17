import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { getAvailableVoices, VoiceOption } from '@/services/voiceService';
import { Card, CardContent} from '@/components/ui/card';
import { BeamsBackground } from '@/components/ui/beams-background';
import { Progress } from '@/components/ui/progress';

// Define types for our components
interface DialogueLine {
  speaker: string;
  text: string;
}

// Videos available for selection
const AVAILABLE_VIDEOS = [
  { 
    id: 'MINECRAFT_CLOUD', 
    name: 'Minecraft', 
    file: 'https://res.cloudinary.com/dgj5gkigf/video/upload/t7z3ei3sbclrbt8diwhi.mp4', 
    thumbnail: '/img/minecraft.jpg',
    isExternal: true
  },
  { 
    id: 'SUBWAY_CLOUD', 
    name: 'Subway Surfers', 
    file: 'https://res.cloudinary.com/dgj5gkigf/video/upload/jauzt4hfsctykznzzwsi.mp4', 
    thumbnail: '/img/subway.jpg',
    isExternal: true
  }
];

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
  const [selectedVideo, setSelectedVideo] = useState<string>(AVAILABLE_VIDEOS[0].file);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [dialogue, setDialogue] = useState<DialogueLine[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVoiceApiAvailable, setIsVoiceApiAvailable] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  // Add session ID state to keep it consistent across requests
  const [sessionId] = useState<string>(`session-${Date.now()}-${Math.floor(Math.random() * 1000000)}`);
  
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

  // Effect to simulate processing progress when generating video
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (loading && currentStep === 3 && uploadProgress === 100) {
      // Define processing stages
      const stages = [
        'Generating voices...',
        'Creating audio tracks...',
        'Combining with gameplay...',
        'Adding subtitles...',
        'Finalizing video...'
      ];
      
      // Start at 0% for processing
      setProcessingProgress(0);
      setProcessingStage(stages[0]);
      
      // Create a dynamic interval that speeds up as progress increases
      interval = setInterval(() => {
        setProcessingProgress(prev => {
          // Calculate new progress
          const increment = Math.random() * (prev < 50 ? 1 : prev < 80 ? 0.5 : 0.2);
          const newProgress = Math.min(prev + increment, 99); // never reach 100% automatically
          
          // Update processing stage based on progress
          const stageIndex = Math.min(Math.floor(newProgress / 20), stages.length - 1);
          setProcessingStage(stages[stageIndex]);
          
          return newProgress;
        });
      }, 800);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, currentStep, uploadProgress]);

  const steps = [
    'Enter Topic',
    'Select Voices',
    'Choose Gameplay',
    'Generate Video'
  ];
  
  // Rest of your handler functions remain unchanged
  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value);
  };

  const handleVoice1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVoice1(e.target.value);
  };
  
  const handleVoice2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVoice2(e.target.value);
  };

  const handleGenerateScript = async () => {
    // Existing script generation logic...
    if (!topic) {
      toast.error('Please enter a topic');
      return;
    }
    setLoading(true);
    toast.info('Generating script...');
    
    try {
      // Use absolute URL for production deployment
      const apiUrl = `${import.meta.env.VITE_SERVER_URL}/api/video/generate-script`;
      console.log('Calling API at:', apiUrl);
      
      const response = await axios({
        method: 'post',
        url: apiUrl,
        data: { topic, sessionId }, // Include session ID in request
        timeout: 120000, // 2 minutes timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.data.success) {
        setDialogue(response.data.dialogue);
        toast.success('Script generated successfully!');
        setCurrentStep(1); // Move to voice selection
      } else {
        toast.error('Failed to generate script');
      }
    } catch (error: any) {
      console.error('Error generating script:', error);
      
      // Try the fallback route
      try {
        console.log('Trying fallback route...');
        const fallbackResponse = await axios({
          method: 'post',
          url: `${import.meta.env.VITE_SERVER_URL}/api/fallback/generate-script`,
          data: { topic, sessionId }, // Include session ID in request
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
    // Reset progress indicators
    setUploadProgress(0);
    setProcessingProgress(0);
    setProcessingStage('');
    
    if (!topic || !voice1 || !voice2 || !selectedVideo) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    toast.info('Processing your request...');

    // Fetch the external video from Cloudinary
    let videoBlob;
    try {
      // Fetch the video file from Cloudinary
      const response = await fetch(selectedVideo);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status}`);
      }
      videoBlob = await response.blob();
    } catch (error) {
      console.error('Error fetching Cloudinary video:', error);
      toast.error('Failed to load the selected video');
      setLoading(false);
      return;
    }

    // Extract filename from URL
    const filename = selectedVideo.split('/').pop() || 'cloudinary-video.mp4';
    
    // Create a File object from the blob
    const videoFile = new File([videoBlob], filename, { type: videoBlob.type || 'video/mp4' });

    const formData = new FormData();    formData.append('topic', topic);
    formData.append('voice1', voice1);
    formData.append('voice2', voice2);
    formData.append('gameplayVideo', videoFile);
    formData.append('sessionId', sessionId);
    
    console.log(`Using session ID for video generation: ${sessionId}`);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/video/create`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 600000, // 10 minutes timeout for large files
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(percentCompleted);
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        }
      );      if (response.data.success) {
        // Set processing to 100% when complete
        setProcessingProgress(100);
        const fullVideoUrl = `${import.meta.env.VITE_SERVER_URL}${response.data.videoUrl}`;
        setVideoUrl(fullVideoUrl);
        toast.success('Video generated successfully!');
        
        // Clean up session files on the server to prevent buildup of temporary files
        try {
          await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/video/cleanup`, {
            sessionId: sessionId
          });
          console.log('Session cleanup successful');
        } catch (cleanupError) {
          console.error('Failed to clean up session:', cleanupError);
          // Non-critical error, don't show to user
        }
      } else {
        toast.error('Failed to generate video');
      }
    } catch (error: any) {
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
    setSelectedVideo(AVAILABLE_VIDEOS[0].file);
    setVideoUrl('');
    setCurrentStep(0);
    setUploadProgress(0);
    setProcessingProgress(0);
    setProcessingStage('');
    
    // Reset voice options to defaults if needed
    const defaultFemale = voiceOptions.find(v => v.gender === 'female')?.id || 'female-1';
    const defaultMale = voiceOptions.find(v => v.gender === 'male')?.id || 'male-1';
    setVoice1(defaultFemale);
    setVoice2(defaultMale);
    
    toast.info('Ready to create a new video!');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <label className="block text-lg font-medium text-white">
              Enter a topic for your video
            </label>
            <input
              type="text"
              value={topic}
              onChange={handleTopicChange}
              placeholder="Enter your topic here..."
              className="w-full p-4 border border-slate-700/50 rounded-xl bg-black/30 text-white backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              disabled={loading}
            />
          </div>
        );
        
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-medium mb-2 text-white">
                Voice for Nina
              </label>
              <select
                value={voice1}
                onChange={handleVoice1Change}
                className="w-full p-4 border border-slate-700/50 rounded-xl bg-black/30 text-white backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                <p className="mt-2 text-sm text-purple-300">

                </p>
              )}
            </div>
            
            <div>
              <label className="block text-lg font-medium mb-2 text-white">
                Voice for Jay
              </label>
              <select
                value={voice2}
                onChange={handleVoice2Change}
                className="w-full p-4 border border-slate-700/50 rounded-xl bg-black/30 text-white backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                <p className="mt-2 text-sm text-purple-300">

                </p>
              )}
            </div>
            
            {dialogue.length > 0 && (
              <div className="mt-6 p-6 border border-slate-700/50 rounded-xl bg-black/40 backdrop-blur-md">
                <h3 className="font-semibold mb-4 text-white text-lg">Generated Dialogue:</h3>
                <div className="space-y-3">
                  {dialogue.map((line, index) => (
                    <p key={index} className="text-slate-200">
                      <span className="font-bold text-purple-400">{line.speaker}:</span> {line.text}
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
            <label className="block text-lg font-medium text-white mb-4">
              Select gameplay video
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {AVAILABLE_VIDEOS.map((video) => (
                <label
                  key={video.id}
                  className={`cursor-pointer border-2 ${
                    selectedVideo === video.file ? 'border-purple-500' : 'border-slate-700/50'
                  } rounded-xl p-4 flex flex-col items-center bg-black/30 backdrop-blur-sm hover:bg-black/40 transition-all duration-300 transform ${
                    selectedVideo === video.file ? 'scale-105' : 'hover:scale-102'
                  }`}
                >
                  <input
                    type="radio"
                    name="videoSelection"
                    value={video.file}
                    checked={selectedVideo === video.file}
                    onChange={() => setSelectedVideo(video.file)}
                    className="sr-only"
                  />
                  <div className="relative w-full aspect-video rounded-lg mb-3 overflow-hidden shadow-lg">
                    <img 
                      src={video.thumbnail} 
                      alt={`${video.name} thumbnail`}
                      className="w-full h-full object-cover"
                    />
                    {selectedVideo === video.file && (
                      <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                        <div className="rounded-full bg-purple-500 w-8 h-8 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={`mt-1 font-medium text-lg ${
                    selectedVideo === video.file ? 'text-purple-400' : 'text-white'
                  }`}>
                    {video.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <div className="p-6 border border-slate-700/50 rounded-xl bg-black/40 backdrop-blur-md">
              <h3 className="font-semibold mb-4 text-white text-lg">Summary:</h3>
              <div className="space-y-3">
                <p className="text-slate-200">
                  <span className="font-semibold text-purple-400">Topic:</span> {topic}
                </p>
                <p className="text-slate-200">
                  <span className="font-semibold text-purple-400">Voice for Nina:</span> {voiceOptions.find((v: VoiceOption) => v.id === voice1)?.name}
                </p>
                <p className="text-slate-200">
                  <span className="font-semibold text-purple-400">Voice for Jay:</span> {voiceOptions.find((v: VoiceOption) => v.id === voice2)?.name}
                </p>
                <p className="text-slate-200">
                  <span className="font-semibold text-purple-400">Gameplay video:</span> {AVAILABLE_VIDEOS.find(v => v.file === selectedVideo)?.name}
                </p>
              </div>
            </div>
            
            {/* Progress indicators for video generation */}
            {loading && (
              <div className="mt-6 p-6 border border-slate-700/50 rounded-xl bg-black/40 backdrop-blur-md">
                <h3 className="font-semibold mb-4 text-white text-lg">
                  Generating your video...
                </h3>
                
                {/* Upload progress section */}
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-300">Uploading video</span>
                    <span className="text-sm font-medium text-purple-300">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2 bg-slate-700/50" />
                </div>
                
                {/* Processing progress section - only show after upload complete */}
                {uploadProgress === 100 && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-300">{processingStage}</span>
                      <span className="text-sm font-medium text-purple-300">{Math.round(processingProgress)}%</span>
                    </div>
                    <Progress value={processingProgress} className="h-2 bg-slate-700/50" />
                    {/* Fun loading messages */}
                    <div className="mt-4 text-center">
                      <p className="text-sm text-slate-400 italic animate-pulse">
                        {processingProgress < 30 && "AI is working its magic..."}
                        {processingProgress >= 30 && processingProgress < 60 && "Almost there, adding the special sauce..."}
                        {processingProgress >= 60 && processingProgress < 90 && "Putting on the finishing touches..."}
                        {processingProgress >= 90 && "Just a moment more for perfection..."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {videoUrl && (
              <div className="mt-8">
                <h3 className="font-semibold mb-4 text-white text-lg">Generated Video:</h3>
                <div className="aspect-video bg-black/50 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full"
                    poster="/placeholder-video.png"
                  />
                </div>
                
                <div className="mt-6 flex flex-wrap gap-4 justify-center">
                    <a
                    href={videoUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 font-medium shadow-lg hover:shadow-green-500/25"
                    >
                    Download Video
                    </a>
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 font-medium shadow-lg hover:shadow-purple-500/25"
                  >
                    Create New Video
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="relative min-h-screen">
      {/* Fixed Beams Background */}
      <div className="fixed inset-0 z-0">
        <BeamsBackground intensity="strong" className="w-full h-full">
        </BeamsBackground>
      </div>
      
      {/* Gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/30 z-[1]"></div>

      {/* Upgrade Notice Banner */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <div className="container max-w-6xl mx-auto px-4 py-2 text-center">
          <p className="text-sm font-medium animate-pulse">
            🚀 Upgrading StudyReels! App temporarily closed for improvements. Please visit again soon!
          </p>
        </div>
      </div>

      {/* Rest of your component remains the same */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl pt-16">
          {/* Upgrade Notice Card */}
 

          <div className="text-center mb-4 sm:mb-8 opacity-50">
            <div className="mb-4 p-3"></div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-2">
              <span className="bg-gradient-to-r from-white/60 via-purple-200/60 to-blue-200/60 bg-clip-text text-transparent">Study</span>
              <span className="px-6 py-2 bg-orange-500/60 text-black rounded-lg">Reels</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Transform any topic into viral-worthy content with AI voices and gameplay backgrounds
              <br />
              <span className="text-orange-300 text-sm">(Coming back soon after upgrade!)</span>
            </p>
          </div>
          
          {/* Progress Indicator - Disabled */}
          <div className="mb-8 opacity-40">
            <div className="flex justify-between mb-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex-1 text-center text-slate-500"
                >
                  {step}
                </div>
              ))}
            </div>
            <div className="w-full bg-slate-700/50 backdrop-blur-sm rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-gray-600 to-gray-500 h-2.5 rounded-full"
                style={{ width: '0%' }}
              ></div>
            </div>
          </div>
          
          {/* Disabled Form Preview */}
          <Card className="bg-black/10 border-slate-700/30 backdrop-blur-md shadow-2xl mb-8 opacity-40">
            <CardContent className="p-6 md:p-8">
              <div className="space-y-4">
                <label className="block text-lg font-medium text-gray-400">
                  Enter a topic for your video (Currently Disabled)
                </label>
                <input
                  type="text"
                  placeholder="This feature is temporarily unavailable..."
                  className="w-full p-4 border border-slate-700/30 rounded-xl bg-black/20 text-gray-500 backdrop-blur-sm cursor-not-allowed"
                  disabled
                />
                <p className="text-slate-500 text-sm text-center">
                  All features will be available after our upgrade is complete!
                </p>
              </div>
            </CardContent>
          </Card>
            
          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              onClick={handleBack}
              disabled={currentStep === 0 || loading}
              variant="outline"
              className="transition-all duration-200 bg-black/30 border-slate-700/50 text-white hover:bg-black/50 hover:text-purple-300"
            >
              Back
            </Button>
            
            <Button
              disabled
              className="bg-gray-600 text-gray-300 cursor-not-allowed"
            >
              Temporarily Unavailable
            </Button>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="w-full py-6 relative z-10 mt-auto">
          <div className="container mx-auto px-4 text-center">
            <p className="text-slate-400 text-sm backdrop-blur-sm">
              Made with <span className="text-red-500 animate-pulse">❤️</span> by{" "}
                <a 
                  href="https://github.com/Amrit-Nigam" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-purple-300 font-medium hover:text-purple-200 transition-colors duration-200"
                >
                  Amrit-Nigam
                </a>
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Currently upgrading for a better experience 🚀
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default VideoGenerator;
