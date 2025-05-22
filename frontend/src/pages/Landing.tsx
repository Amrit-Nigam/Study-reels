import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center">
      <div className="container max-w-4xl px-4 py-16 text-center">
        <h1 className="text-6xl font-bold mb-4">🧠 Brainrot</h1>
        <p className="text-xl mb-8">Generate entertaining dialogue videos with AI-powered voices</p>
        
        <div className="max-w-2xl mx-auto mb-10 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">How it works</h2>
          <ol className="text-left space-y-4">
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">1</span>
              <span>Enter a <strong>topic</strong> for your video</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">2</span>
              <span>Our AI generates a <strong>dialogue script</strong> between two characters</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">3</span>
              <span>Select <strong>realistic voices</strong> for the characters</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">4</span>
              <span>Upload your <strong>gameplay video</strong> for the background</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">5</span>
              <span>Get your <strong>complete video</strong> with dialogue audio and subtitles</span>
            </li>
          </ol>
        </div>
        
        <Button 
          onClick={() => navigate('/create')}
          size="lg"
          className="text-lg py-6 px-8"
        >
          Create Your Video
        </Button>
      </div>
    </div>
  );
};
