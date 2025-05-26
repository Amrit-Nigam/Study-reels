import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BeamsBackground } from '@/components/ui/beams-background';
import { RotatingText } from '@/components/ui/rotating-text';
export const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Fixed Aurora Background */}
      <div className="fixed inset-0 z-0">
        <BeamsBackground intensity="strong" className="w-full h-full">
        </BeamsBackground>
      </div>
      
      {/* Scrollable Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="container max-w-6xl px-4 py-8 text-center flex-1">
          {/* Hero Section */}
          <div className="mb-16 pt-8">
            <div className="mb-6"></div>
            <h1 className="text-7xl md:text-8xl font-bold relative z-20 flex justify-center items-center gap-2">
              <span className="bg-gradient-to-r from-white/90 via-purple-200/90 to-blue-200/90 bg-clip-text text-transparent backdrop-blur-sm">Study</span>
              <RotatingText
              texts={['Reels', 'Fast','Smart','Hard','Easy']}
              mainClassName="px-6 py-2 bg-blue-500/90 text-black overflow-hidden rounded-lg backdrop-blur-sm"
              staggerFrom={"last"}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={2000}
              />
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-slate-200 max-w-3xl mx-auto leading-relaxed">
              Transform any topic into viral-worthy dialogue videos with AI-powered voices and gameplay backgrounds
            </p>
            
            <Button 
              onClick={() => navigate('/create')}
              size="lg"
              className="text-lg py-6 px-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
            >
              Start Creating Now
            </Button>
          </div>
          
          {/* How it works section */}
          <Card className="max-w-4xl mx-auto bg-black/20 border-slate-700/50 backdrop-blur-md shadow-2xl mb-16">
            <CardHeader className="pb-6">
              <CardTitle className="text-3xl font-bold text-white mb-2">How it works</CardTitle>
              <p className="text-slate-300">Simple steps to create engaging content</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-4 group">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    1
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white mb-1">Enter Your Topic</h3>
                    <p className="text-slate-300">Provide any subject you want your video to discuss</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 group">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    2
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white mb-1">AI Script Generation</h3>
                    <p className="text-slate-300">Our AI creates engaging dialogue between characters</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 group">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    3
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white mb-1">Choose Voices</h3>
                    <p className="text-slate-300">Select realistic AI voices for each character</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 group">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    4
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white mb-1">Pick Background</h3>
                    <p className="text-slate-300">Choose from various gameplay videos</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-700/50">
                <div className="flex items-center justify-center space-x-4 group">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    ✓
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-white mb-1">Get Your Video</h3>
                    <p className="text-slate-300">Download your complete video with audio and subtitles</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Footer */}
        <footer className="w-full py-6 relative z-10 mt-auto">
          <div className="container max-w-6xl px-4 text-center">
            <p className="text-slate-400 text-sm backdrop-blur-sm">
              Made with <span className="text-red-500 animate-pulse">❤️</span> by{" "}
              <span className="text-purple-300 font-medium hover:text-purple-200 transition-colors duration-200">
                Amrit-Nigam
              </span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};
