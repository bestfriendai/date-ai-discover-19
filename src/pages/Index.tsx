import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { EventsGlobe } from '@/components/home/EventsGlobe';
import { MapIcon, CalendarIcon, HeartIcon, SparklesIcon, CompassIcon, ArrowRightIcon } from 'lucide-react';

const Index = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const sections = document.querySelectorAll('section[id]');
      
      sections.forEach(section => {
        const sectionTop = (section as HTMLElement).offsetTop - 100;
        const sectionHeight = (section as HTMLElement).offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          setActiveSection(section.id);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="bg-slate-950 text-white">
      <Header />
      
      {/* Hero Section with Globe */}
      <section id="hero" className="pt-20 overflow-hidden relative">
        {/* Background gradients */}
        <div className="absolute top-0 left-0 right-0 h-[80vh] bg-gradient-to-b from-indigo-600/10 via-purple-500/5 to-transparent z-0"></div>
        <div className="absolute top-0 -right-1/3 w-2/3 h-[70vh] bg-gradient-to-bl from-blue-500/10 to-transparent z-0 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-1/4 w-1/2 h-[50vh] bg-gradient-to-tr from-purple-500/10 to-transparent z-0 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-8 min-h-[80vh] py-12">
            {/* Left Column: Text Content */}
            <motion.div 
              className="flex-1 pt-10 lg:pt-0 order-2 lg:order-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">Discover Events</span> 
                <span className="block mt-2 text-indigo-400">Never Miss Out Again</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl leading-relaxed">
                Find the most exciting events happening around you, visualize them on an interactive map, and create memorable experiences with FomoAI.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/map">
                  <Button 
                    size="lg" 
                    className="font-medium text-base w-full sm:w-auto rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white border-0 shadow-lg shadow-indigo-500/20 transition-all"
                  >
                    Explore Map <MapIcon className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/events">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="font-medium text-base w-full sm:w-auto rounded-full border-2 border-indigo-500/30 hover:border-indigo-500/70 hover:bg-indigo-500/10 transition-all backdrop-blur-sm"
                  >
                    Browse Events <CalendarIcon className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center ring-2 ring-slate-900 text-xs font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <p>Join thousands of users finding amazing events</p>
              </div>
            </motion.div>
            
            {/* Right Column: Globe Visualization */}
            <motion.div 
              className="flex-1 flex justify-center items-center pt-20 pb-10 lg:pb-0 order-1 lg:order-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="relative w-full max-w-lg">
                {/* Floating elements around globe */}
                <div className="absolute top-1/4 right-0 transform translate-x-1/2 bg-blue-500 bg-opacity-30 rounded-full w-6 h-6 blur-sm animate-pulse"></div>
                <div className="absolute bottom-1/4 left-0 transform -translate-x-1/2 bg-purple-500 bg-opacity-30 rounded-full w-8 h-8 blur-sm animate-pulse animation-delay-2000"></div>
                
                {/* Globe container with glow effect */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 via-blue-500/10 to-purple-500/20 blur-2xl transform scale-110"></div>
                  <EventsGlobe 
                    size={windowWidth < 768 ? 300 : 500}
                    className="relative z-10"
                  />
                </div>
                
                {/* Floating city indicators */}
                <div className="absolute top-10 right-10 bg-white/5 backdrop-blur-md rounded-lg p-2 border border-white/10 shadow-xl animate-float">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-xs font-medium">New York</span>
                  </div>
                </div>
                <div className="absolute bottom-20 left-5 bg-white/5 backdrop-blur-md rounded-lg p-2 border border-white/10 shadow-xl animate-float-delay">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                    <span className="text-xs font-medium">Tokyo</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        >
          <span className="text-sm text-slate-400 mb-2">Scroll to explore</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M12 19L19 12M12 19L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 z-0"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">How FomoAI Works</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">A powerful platform designed to help you discover, visualize, and plan the perfect outings.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <MapIcon className="w-8 h-8 text-indigo-400" />,
                title: "Interactive Map",
                description: "Explore events in your area with our dynamic map interface that shows what's happening nearby.",
                delay: 0.1
              },
              {
                icon: <CalendarIcon className="w-8 h-8 text-blue-400" />,
                title: "Smart Filtering",
                description: "Narrow down events by category, date, price range and more to find exactly what you're looking for.",
                delay: 0.2
              },
              {
                icon: <CompassIcon className="w-8 h-8 text-purple-400" />,
                title: "Location Services",
                description: "Get directions, distance information, and transportation options to any event with one tap.",
                delay: 0.3
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 md:p-8 transition-all hover:bg-slate-800/70 hover:border-indigo-500/30"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: feature.delay, duration: 0.5 }}
              >
                <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl p-3 inline-block mb-6 shadow-lg shadow-indigo-600/20">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-slate-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
          
          {/* Map Preview */}
          <motion.div 
            className="mt-20 rounded-xl overflow-hidden shadow-2xl border border-slate-800 h-[500px] bg-slate-900 relative"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-900 z-10"></div>
            <div className="absolute bottom-8 left-8 right-8 z-20">
              <h3 className="text-2xl font-bold mb-4">Interactive Event Map</h3>
              <p className="text-slate-300 mb-6 max-w-xl">Discover what's happening around you with our powerful map visualization. Filter by category, time, or distance.</p>
              <Link to="/map">
                <Button className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium">Explore the Map <ArrowRightIcon className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="absolute top-4 left-4 right-4 flex gap-2 z-20">
              {['All', 'Music', 'Arts', 'Sports', 'Food', 'Party'].map((category, i) => (
                <div 
                  key={i} 
                  className={`text-xs font-medium py-1 px-3 rounded-full ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}
                >
                  {category}
                </div>
              ))}
            </div>
            <img 
              src="https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/-73.9857,40.7484,11,0/1200x500?access_token=pk.eyJ1IjoiZm9tb2FpIiwiYSI6ImNscnQ3MnZ4ODAzbTkycXBkMTh5Z3I0MnkifQ.GN3TvlfQ0nLXSKA7-5g5AQ" 
              alt="Map Preview" 
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section id="cta" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-indigo-950/50 z-0"></div>
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-950 to-transparent z-0"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="bg-gradient-to-br from-indigo-600/20 via-blue-600/10 to-purple-600/20 rounded-3xl p-8 md:p-12 border border-indigo-500/20 shadow-xl backdrop-blur-sm">
            <motion.div 
              className="max-w-3xl mx-auto text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-block bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full p-3 mb-6">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                Ready to discover amazing events near you?
              </h2>
              <p className="text-lg md:text-xl text-slate-300 mb-8">
                Stop wondering where to go and what to do. Start discovering exciting events and create memorable experiences with FomoAI.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/map">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto rounded-full bg-white hover:bg-slate-100 text-indigo-700 font-medium text-base px-8"
                  >
                    Get Started Now
                  </Button>
                </Link>
                <Link to="/about">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full sm:w-auto rounded-full border-2 border-white/30 hover:bg-white/10 font-medium text-base px-8"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 border-t border-slate-800/80 bg-slate-950">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-12">
            <div className="col-span-1 md:col-span-1 lg:col-span-1">
              <div className="flex items-center mb-5">
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full p-2 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M15 2H9a1 1 0 0 0-1 1v4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-3V3a1 1 0 0 0-1-1ZM9 4v4h6V4H9Z"/><path d="M9 14h6"/><path d="M9 18h6"/></svg>
                </div>
                <span className="font-bold text-xl bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">FomoAI</span>
              </div>
              <p className="text-slate-400 mb-6 max-w-xs">Discover events near you, visualize them on a map, and never miss out on amazing experiences again.</p>
              <div className="flex gap-4">
                {['twitter', 'facebook', 'instagram', 'linkedin'].map((social, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-indigo-600 transition-colors">
                    <span className="sr-only">{social}</span>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">Features</h3>
              <ul className="space-y-3">
                {['Interactive Map', 'Event Discovery', 'Event Planning', 'Favorites', 'Location Services'].map((link, i) => (
                  <li key={i}><a href="#" className="text-slate-400 hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">Company</h3>
              <ul className="space-y-3">
                {['About Us', 'Blog', 'Careers', 'Press', 'Contact'].map((link, i) => (
                  <li key={i}><a href="#" className="text-slate-400 hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">Legal</h3>
              <ul className="space-y-3">
                {['Terms of Service', 'Privacy Policy', 'Cookie Policy', 'Data Processing'].map((link, i) => (
                  <li key={i}><a href="#" className="text-slate-400 hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-500 text-sm order-2 md:order-1 mt-4 md:mt-0">&copy; {new Date().getFullYear()} FomoAI. All rights reserved.</p>
            <div className="flex gap-4 order-1 md:order-2">
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Privacy</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Terms</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Fixed Navigation Indicator */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 hidden md:block">
        <div className="bg-slate-800/80 backdrop-blur-md rounded-full p-1.5 border border-slate-700/50 shadow-xl">
          <div className="flex gap-1">
            {[
              { id: 'hero', label: 'Home' },
              { id: 'features', label: 'Features' },
              { id: 'cta', label: 'Get Started' }
            ].map(section => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${activeSection === section.id ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {section.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
