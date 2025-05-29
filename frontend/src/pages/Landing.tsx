import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BeamsBackground } from '@/components/ui/beams-background';
import { RotatingText } from '@/components/ui/rotating-text';

export const Landing = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  // Track scroll position for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative">
      {/* Fixed Aurora Background */}
      <div className="fixed inset-0 z-0">
        <BeamsBackground intensity="strong" className="w-full h-full">
        </BeamsBackground>
      </div>
      
      {/* Gradient overlay - subtle depth effect on scroll */}
      <div 
        className="fixed inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/30 z-[1]"
        style={{ opacity: Math.min(scrollY / 800, 0.5) }}
      ></div>
        {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-black/10 backdrop-blur-md border-b border-white/10">
          <div className="container max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white/90 via-purple-200/90 to-blue-200/90 bg-clip-text text-transparent">
                Study<span className="text-blue-500/90">Reels</span>
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate('/create')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm sm:text-base py-1 px-3 sm:px-4"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>
        {/* Scrollable Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Hero Section with padding for navbar */}
        <div className="container max-w-6xl px-4 pt-24 sm:pt-28 md:pt-32 pb-8 sm:pb-12 md:pb-16 text-center flex-1">
          <div className="mb-8 sm:mb-12 md:mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-block px-4 py-1 rounded-full bg-blue-500/20 text-blue-300 mb-6 text-sm font-medium border border-blue-500/30"
            >
              AI-Powered Video Creation
            </motion.div>
              <motion.h1 
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold relative z-20 flex flex-wrap justify-center items-center gap-2 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="bg-gradient-to-r from-white/90 via-purple-200/90 to-blue-200/90 bg-clip-text text-transparent backdrop-blur-sm">Study</span>
              <RotatingText
                texts={['Reels', 'Fast','Smart','Hard','Easy']}
                mainClassName="px-4 sm:px-6 py-1 sm:py-2 bg-blue-500/90 text-black overflow-hidden rounded-lg backdrop-blur-sm"
                staggerFrom={"last"}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                staggerDuration={0.025}
                splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                rotationInterval={2000}
              />
            </motion.h1>
              <motion.p 
              className="text-base sm:text-lg md:text-xl lg:text-2xl mb-4 sm:mb-6 md:mb-8 text-slate-200 max-w-3xl mx-auto leading-relaxed px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Transform any topic into viral-worthy dialogue videos with AI-powered voices and gameplay backgrounds
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >              <Button 
                onClick={() => navigate('/create')}
                size="lg"
                className="text-base sm:text-lg py-5 sm:py-6 px-8 sm:px-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
              >
                Start Creating Now
              </Button>
            </motion.div>
          </div>            {/* How it works section */}
          <Card id="how-it-works" className="max-w-4xl mx-auto bg-black/20 border-slate-700/50 backdrop-blur-md shadow-2xl mb-16">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-white mb-2">How it works</CardTitle>
              <p className="text-slate-300">Simple steps to create engaging content</p>
            </CardHeader>
            <CardContent className="space-y-6 px-4 sm:px-6">
              <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div 
                  className="flex items-start space-x-4 group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    1
                  </div>                  <div className="text-left">
                    <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">Enter Your Topic</h3>
                    <p className="text-slate-300 text-xs sm:text-sm">Provide any subject you want your video to discuss</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="flex items-start space-x-4 group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    2
                  </div>                  <div className="text-left">
                    <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">AI Script Generation</h3>
                    <p className="text-slate-300 text-xs sm:text-sm">Our AI creates engaging dialogue between characters</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="flex items-start space-x-4 group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    3
                  </div>                  <div className="text-left">
                    <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">Choose Voices</h3>
                    <p className="text-slate-300 text-xs sm:text-sm">Select realistic AI voices for each character</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="flex items-start space-x-4 group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    4
                  </div>                  <div className="text-left">
                    <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">Pick Background</h3>
                    <p className="text-slate-300 text-xs sm:text-sm">Choose from various gameplay videos</p>
                  </div>
                </motion.div>
              </div>
              
              <div className="pt-4 border-t border-slate-700/50">
                <motion.div 
                  className="flex items-center justify-center space-x-4 group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    ✓
                  </div>                  <div className="text-center">
                    <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">Get Your Video</h3>
                    <p className="text-slate-300 text-xs sm:text-sm">Download your complete video with audio and subtitles</p>
                  </div>
                </motion.div>
              </div>
            </CardContent>          </Card>        </div>
          {/* Footer */}
        <footer className="w-full py-8 sm:py-12 relative z-10 mt-auto border-t border-white/10">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="pt-4 sm:pt-8 text-center">
              <p className="text-slate-400 text-xs sm:text-sm backdrop-blur-sm">
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
            </div>
          </div>
        </footer>
      </div>
    </div>  );
};
