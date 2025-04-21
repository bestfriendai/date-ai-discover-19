import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { EventsGlobe } from '@/components/home/EventsGlobe';
import { MapIcon, CalendarIcon, SparklesIcon, ArrowRightIcon, GlobeIcon, FilterIcon, RouteIcon } from 'lucide-react';
import { searchEvents } from '@/services/eventService'; // Import searchEvents

const Index = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeSection, setActiveSection] = useState('hero');
  const [eventLocations, setEventLocations] = useState<[number, number][]>([]); // State for event locations

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const sections = document.querySelectorAll('section[id]');

      sections.forEach(section => {
        const sectionTop = (section as HTMLElement).offsetTop - 150; // Adjusted offset for better section highlighting
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

  useEffect(() => {
    // Fetch events within a 30-mile radius of a placeholder location (e.g., New York)
    const fetchLocalEvents = async () => {
      try {
        // Get current date and format it as YYYY-MM-DD
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 3); // Look 3 months ahead
        
        const startDate = today.toISOString().split('T')[0];
        const endDate = nextMonth.toISOString().split('T')[0];
        
        // First, fetch local events (30-mile radius)
        const localParams = {
          latitude: 40.7128, // Placeholder latitude (New York)
          longitude: -74.0060, // Placeholder longitude (New York)
          radius: 30, // 30-mile radius
          limit: 200, // Increased limit for more events
          startDate,
          endDate
        };
        
        console.log('[DEBUG] Fetching local events with params:', localParams);
        const localResult = await searchEvents(localParams);
        
        // Then, fetch events from a wider radius to get more variety
        const widerParams = {
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 100, // Wider radius (100 miles)
          limit: 300, // Even more events
          startDate,
          endDate
        };
        
        console.log('[DEBUG] Fetching wider-area events with params:', widerParams);
        const widerResult = await searchEvents(widerParams);
        
        // Combine the results, removing duplicates by ID
        const allEvents = [...(localResult.events || [])];
        const localEventIds = new Set(allEvents.map(event => event.id));
        
        if (widerResult.events) {
          widerResult.events.forEach(event => {
            if (!localEventIds.has(event.id)) {
              allEvents.push(event);
            }
          });
        }
        
        console.log(`[DEBUG] Combined ${localResult.events?.length || 0} local events with ${widerResult.events?.length || 0} wider-area events, total: ${allEvents.length}`);
        
        if (allEvents.length > 0) {
          const locations = allEvents
            .filter(event => event.coordinates) // Filter out events without coordinates
            .map(event => event.coordinates as [number, number]); // Extract coordinates
          
          console.log(`[DEBUG] Found ${locations.length} events with valid coordinates`);
          setEventLocations(locations);
        } else {
          console.warn('[WARN] No events found, globe will be empty');
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchLocalEvents();
  }, []); // Empty dependency array means this runs once on mount

  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="bg-gray-950 text-white min-h-screen">
      <Header />

      {/* Hero Section */}
      <section
        id="hero"
        className="relative overflow-hidden pt-20 pb-12 md:pt-32 md:pb-20 bg-gradient-to-br from-gray-950 via-blue-950/50 to-gray-900"
      >
        {/* Background elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-transparent opacity-60"></div>
          <div className="absolute bottom-0 right-0 w-2/3 h-1/2 bg-gradient-to-tl from-indigo-900/20 via-cyan-900/20 to-transparent opacity-60"></div>
        </div>

        <div className="container mx-auto px-2 md:px-6 relative z-10 flex flex-col md:flex-row md:items-center md:gap-10 lg:gap-20">
          {/* Left Column: Text Content */}
          <motion.div
            className="flex-1 text-center md:text-left mb-10 md:mb-0"
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <h1 className="text-3xl xs:text-4xl md:text-6xl font-extrabold mb-5 leading-tight tracking-tight">
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">Find Your Vibe:</span>
              <span className="block text-white">Discover Events Near You</span>
            </h1>

            <p className="text-base xs:text-lg md:text-xl text-gray-300 mb-7 max-w-xl mx-auto md:mx-0">
              Dive into a world of exciting events happening around you. From hidden local gems to major global gatherings, find experiences that resonate with your interests and create unforgettable moments.
            </p>

            <motion.div
              className="flex flex-col xs:flex-row gap-4 justify-center md:justify-start"
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                <Link to="/map">
                  <Button
                    size="lg"
                    className="font-semibold text-base xs:text-lg w-full xs:w-auto rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg transform transition-transform hover:scale-105"
                  >
                    Explore Map <MapIcon className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link to="/events">
                  <Button
                    size="lg"
                    variant="outline"
                    className="font-semibold text-base xs:text-lg w-full xs:w-auto rounded-full border-2 border-gray-600 text-gray-200 hover:bg-gray-800 hover:border-gray-500 transition-colors transform hover:scale-105"
                  >
                    Browse Events <CalendarIcon className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right Column: Globe Visualization (responsive, visually open, not cropped) */}
          <motion.div
            className="flex-1 flex justify-center items-center w-full min-h-[180px] md:min-h-[320px]"
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <div className="relative w-full flex justify-center items-center min-h-[180px] md:min-h-[320px]">
              {/* Globe background effect */}
              <div
                className="absolute inset-0 blur-2xl animate-pulse-slow"
                style={{
                  borderRadius: '30%',
                  background: 'radial-gradient(circle at 60% 40%, rgba(80,180,255,0.12) 0%, rgba(180,80,255,0.09) 60%, rgba(0,0,0,0.03) 100%)',
                  zIndex: 1
                }}
              ></div>
              {/* Globe (not cropped, open, shadowed) */}
              <div className="absolute inset-0 flex items-center justify-center globe-uncropped">
                <EventsGlobe
                  eventLocations={eventLocations}
                  size={windowWidth < 640 ? 160 : windowWidth < 1024 ? 220 : 320}
                  className="z-10"
                />
              </div>
              {/* Floating event count badge */}
              <div className="absolute -top-3 right-3 bg-gradient-to-r from-blue-600 via-fuchsia-500 to-cyan-400 text-white rounded-full px-2.5 py-0.5 text-xs md:text-sm font-bold shadow-lg border border-white/20 animate-fade-in z-20">
                {eventLocations.length} Events
              </div>
              {/* Decorative floating icons */}
              <div className="absolute left-2 bottom-3 bg-white/10 rounded-full p-1 md:p-2 border border-white/20 shadow-md animate-float-slow z-20">
                <SparklesIcon className="h-4 w-4 md:h-5 md:w-5 text-fuchsia-400" />
              </div>
              <div className="absolute right-2 top-7 bg-white/10 rounded-full p-1 md:p-2 border border-white/20 shadow-md animate-float-slow z-20">
                <GlobeIcon className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 bg-gray-900">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={sectionVariants}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-500">Unlock Amazing Experiences</h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">Our powerful features make finding and enjoying events effortless.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <MapIcon className="w-8 h-8 text-blue-400" />,
                title: "Interactive Event Map",
                description: "See events come alive on a dynamic map. Easily explore what's happening nearby or pinpoint events in any location.",
              },
              {
                icon: <FilterIcon className="w-8 h-8 text-purple-400" />,
                title: "Smart Filtering",
                description: "Quickly find events you'll love with intuitive filters for category, date, price, distance, and more.",
              },
              {
                icon: <RouteIcon className="w-8 h-8 text-cyan-400" />,
                title: "Seamless Navigation",
                description: "Get instant directions and plan your journey to any event directly within the app.",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/60 rounded-xl p-8 transition-all hover:bg-gray-700/70 hover:border-blue-600/40 cursor-pointer"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={itemVariants}
                transition={{ delay: index * 0.2 }}
              >
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-4 inline-block mb-6 shadow-lg shadow-blue-500/20">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 md:py-28 relative overflow-hidden">
         <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900/20 via-blue-900/20 to-transparent opacity-50"></div>
        </div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            className="bg-gray-800/70 backdrop-blur-md rounded-3xl p-10 md:p-16 text-center border border-gray-700/70 shadow-2xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={sectionVariants}
          >
            <div className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-4 mb-6 shadow-lg shadow-purple-500/30">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
              Ready to Experience More?
            </h2>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
              Join FomoAI today and unlock a world of vibrant events happening all around you. Stop missing out and start making memories.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-5">
              <Link to="/map">
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-full bg-white hover:bg-gray-200 text-indigo-700 font-semibold text-lg px-10 transform transition-transform hover:scale-105"
                >
                  Get Started
                </Button>
              </Link>
              <Link to="/about">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto rounded-full border-2 border-white/40 text-white hover:bg-white/10 font-semibold text-lg px-10 transition-colors transform hover:scale-105"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-800 bg-gray-950">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-12">
            <div className="col-span-1 md:col-span-1 lg:col-span-1">
              <div className="flex items-center mb-5">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-2 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M15 2H9a1 1 0 0 0-1 1v4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-3V3a1 1 0 0 0-1-1ZM9 4v4h6V4H9Z"/><path d="M9 14h6"/><path d="M9 18h6"/></svg>
                </div>
                <span className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">FomoAI</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-xs">Your ultimate guide to discovering, visualizing, and experiencing the best events around you.</p>
              <div className="flex gap-4">
                {/* Replace with actual social icons */}
                {['twitter', 'facebook', 'instagram', 'linkedin'].map((social, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors">
                    <span className="sr-only">{social}</span>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-white">Features</h3>
              <ul className="space-y-3">
                {['Interactive Map', 'Event Discovery', 'Advanced Filtering', 'Route Planning', 'Favorites'].map((link, i) => (
                  <li key={i}><a href="#" className="text-gray-400 hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-white">Company</h3>
              <ul className="space-y-3">
                {['About Us', 'Blog', 'Careers', 'Press', 'Contact'].map((link, i) => (
                  <li key={i}><a href="#" className="text-gray-400 hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-white">Legal</h3>
              <ul className="space-y-3">
                {['Terms of Service', 'Privacy Policy', 'Cookie Policy'].map((link, i) => (
                  <li key={i}><a href="#" className="text-gray-400 hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm order-2 md:order-1 mt-4 md:mt-0">&copy; {new Date().getFullYear()} FomoAI. All rights reserved.</p>
            <div className="flex gap-4 order-1 md:order-2">
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Fixed Navigation Indicator */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 hidden md:block">
        <div className="bg-gray-800/80 backdrop-blur-md rounded-full p-1.5 border border-gray-700/50 shadow-xl">
          <div className="flex gap-1">
            {[
              { id: 'hero', label: 'Home' },
              { id: 'features', label: 'Features' },
              { id: 'cta', label: 'Get Started' }
            ].map(section => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${activeSection === section.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}
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
