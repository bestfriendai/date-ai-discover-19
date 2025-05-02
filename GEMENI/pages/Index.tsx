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

        // Check for API errors in sourceStats
        if (localResult.sourceStats || widerResult.sourceStats) {
          const hasErrors = (
            localResult.sourceStats?.ticketmaster?.error ||
            localResult.sourceStats?.predicthq?.error ||
            widerResult.sourceStats?.ticketmaster?.error ||
            widerResult.sourceStats?.predicthq?.error
          );

          if (hasErrors) {
            console.error('[ERROR] API errors:', {
              localSourceStats: localResult.sourceStats,
              widerSourceStats: widerResult.sourceStats
            });
          }
        }

        if (allEvents.length > 0) {
          const locations = allEvents
            .filter(event => event.coordinates) // Filter out events without coordinates
            .map(event => event.coordinates as [number, number]); // Extract coordinates

          console.log(`[DEBUG] Found ${locations.length} events with valid coordinates`);
          setEventLocations(locations);
        } else {
          console.warn('[WARN] No events found, using fallback locations');

          // Fallback: Use major city coordinates if no events are found
          const fallbackLocations: [number, number][] = [
            [-74.0060, 40.7128], // New York
            [-118.2437, 34.0522], // Los Angeles
            [-87.6298, 41.8781], // Chicago
            [-95.3698, 29.7604], // Houston
            [-122.4194, 37.7749], // San Francisco
            [-0.1278, 51.5074], // London
            [2.3522, 48.8566], // Paris
            [13.4050, 52.5200], // Berlin
            [139.6917, 35.6895], // Tokyo
            [151.2093, -33.8688], // Sydney
          ];

          setEventLocations(fallbackLocations);
        }
      } catch (error) {
        console.error('Error fetching events:', error);

        // Fallback: Use major city coordinates if an error occurs
        const fallbackLocations: [number, number][] = [
          [-74.0060, 40.7128], // New York
          [-118.2437, 34.0522], // Los Angeles
          [-87.6298, 41.8781], // Chicago
          [-95.3698, 29.7604], // Houston
          [-122.4194, 37.7749], // San Francisco
        ];

        setEventLocations(fallbackLocations);
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
    <div className="bg-black text-white min-h-screen overflow-hidden">
      <Header />

      {/* Hero Section */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center pt-24 pb-12 md:pt-28 md:pb-20 overflow-hidden"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-blue-900/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-blue-700/10 via-purple-900/5 to-transparent opacity-70"></div>
          <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent"></div>

          {/* Animated particles */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-blue-500/10 animate-pulse"
                style={{
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 10 + 5}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDuration: `${Math.random() * 8 + 2}s`,
                  animationDelay: `${Math.random() * 5}s`
                }}
              ></div>
            ))}
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column: Text Content */}
            <motion.div
              className="order-2 lg:order-1 text-center lg:text-left"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-block mb-6 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium shadow-lg shadow-blue-900/20 backdrop-blur-sm"
              >
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
                  Discover Events Worldwide
                </span>
              </motion.div>

              <motion.h1
                className="text-4xl xs:text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight drop-shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-500 animate-gradient-x">
                  Find Your Perfect
                </span>
                <span className="block text-white relative">
                  Experience
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-purple-500/30" viewBox="0 0 100 12" preserveAspectRatio="none">
                    <path d="M0,0 Q50,12 100,0" stroke="currentColor" strokeWidth="8" fill="none" />
                  </svg>
                </span>
              </motion.h1>

              <motion.p
                className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.5 }}
              >
                Discover and experience the most exciting events around you. From local gatherings to global celebrations, find what moves you and create memories that last.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.7 }}
              >
                <Link to="/map">
                  <Button
                    size="lg"
                    className="font-medium text-base xs:text-lg w-full sm:w-auto rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-blue-700/20 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-700/30"
                  >
                    Explore Map <MapIcon className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/party">
                  <Button
                    size="lg"
                    className="font-medium text-base xs:text-lg w-full sm:w-auto rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 hover:from-purple-700 hover:via-pink-600 hover:to-red-600 text-white shadow-lg shadow-purple-700/20 transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-700/30"
                  >
                    Party Finder <SparklesIcon className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/events">
                  <Button
                    size="lg"
                    variant="outline"
                    className="font-medium text-base xs:text-lg w-full sm:w-auto rounded-full border-2 border-white/20 text-white hover:bg-white/10 transition-all duration-300 hover:border-white/40 transform hover:scale-105"
                  >
                    Browse Events <CalendarIcon className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div
                className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.9 }}
              >
                {[
                  { value: "10K+", label: "Events" },
                  { value: "150+", label: "Cities" },
                  { value: "24/7", label: "Updates" }
                ].map((stat, index) => (
                  <div key={index} className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">{stat.value}</div>
                    <div className="text-xs text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Column: Globe Visualization */}
            <motion.div
              className="order-1 lg:order-2 relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="relative w-full aspect-square max-w-[600px] mx-auto lg:max-w-none lg:mx-0 lg:w-[130%] lg:-mr-[30%] mt-8 md:mt-0 transform lg:translate-x-8">
                {/* Enhanced glowing background effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600/40 via-purple-600/30 to-transparent blur-3xl animate-pulse-slow"></div>

                {/* Improved rotating rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[90%] h-[90%] rounded-full border-2 border-blue-500/30 animate-spin-slow"></div>
                  <div className="absolute w-[70%] h-[70%] rounded-full border-2 border-purple-500/30 animate-spin-reverse-slow"></div>
                  <div className="absolute w-[110%] h-[110%] rounded-full border border-indigo-500/20 animate-spin-slow-2"></div>
                </div>

                {/* Globe with improved positioning */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <EventsGlobe
                    eventLocations={eventLocations}
                    size={windowWidth < 640 ? 300 : windowWidth < 1024 ? 400 : 520}
                    className="z-10"
                  />
                </div>

                {/* Enhanced floating elements */}
                <div className="absolute left-6 bottom-10 bg-white/15 backdrop-blur-md rounded-full p-2.5 border border-white/30 shadow-lg shadow-purple-500/20 animate-float-slow z-20 transform hover:scale-110 transition-transform duration-300">
                  <SparklesIcon className="h-5 w-5 text-purple-400" />
                </div>
                <div className="absolute right-10 top-16 bg-white/15 backdrop-blur-md rounded-full p-2.5 border border-white/30 shadow-lg shadow-blue-500/20 animate-float-slow-2 z-20 transform hover:scale-110 transition-transform duration-300">
                  <GlobeIcon className="h-5 w-5 text-blue-400" />
                </div>

                {/* Enhanced pulse rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[85%] h-[85%] rounded-full border-2 border-blue-500/50 animate-ping-slow"></div>
                  <div className="w-[95%] h-[95%] rounded-full border border-purple-500/30 animate-ping-slow-2"></div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            <span className="text-sm text-blue-400/80 mb-2">Scroll to explore</span>
            <div className="w-6 h-10 border-2 border-blue-400/50 rounded-full flex justify-center p-1">
              <motion.div
                className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                animate={{
                  y: [0, 12, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: "easeInOut"
                }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 relative">
        {/* Background elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/20 to-black"></div>
          <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-black to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black to-transparent"></div>
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            className="text-center mb-16 md:mb-24"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
            }}
          >
            <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300 text-sm font-medium">
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-cyan-400 mr-2"></span>
                Powerful Features
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">Discover What's Possible</h2>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">Our innovative platform makes finding and experiencing events seamless and exciting.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {[
              {
                icon: <MapIcon className="w-8 h-8 text-white" />,
                title: "Interactive Event Map",
                description: "Visualize events on our dynamic 3D map. Explore what's happening nearby or anywhere in the world with intuitive controls.",
                gradient: "from-blue-600 to-cyan-600",
                delay: 0
              },
              {
                icon: <FilterIcon className="w-8 h-8 text-white" />,
                title: "Smart Filtering",
                description: "Find exactly what you're looking for with powerful filters for category, date, price, distance, and more personalized options.",
                gradient: "from-purple-600 to-pink-600",
                delay: 0.2
              },
              {
                icon: <RouteIcon className="w-8 h-8 text-white" />,
                title: "Seamless Navigation",
                description: "Get instant directions and plan your journey to any event. Integrate with your favorite navigation apps for a smooth experience.",
                gradient: "from-indigo-600 to-blue-600",
                delay: 0.4
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="group relative overflow-hidden rounded-2xl p-1"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.6, delay: feature.delay }
                  }
                }}
              >
                {/* Gradient border */}
                <div className="absolute inset-0 bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                  style={{
                    background: `linear-gradient(to right, ${feature.gradient.split(' ')[0]}, ${feature.gradient.split(' ')[1]})`
                  }}></div>

                <div className="relative h-full bg-black/90 backdrop-blur-sm rounded-xl p-8 border border-white/10 flex flex-col hover:transform hover:scale-[1.02] transition-all duration-300">
                  <div className={`bg-gradient-to-br ${feature.gradient} rounded-xl p-4 inline-block mb-6 shadow-lg`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white">{feature.title}</h3>
                  <p className="text-gray-300 mb-6 flex-grow">{feature.description}</p>
                  <div className="mt-auto">
                    <Link to="/map" className="inline-flex items-center text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                      Learn more <ArrowRightIcon className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-24 md:py-32 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-blue-900/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-black to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black to-transparent"></div>
        </div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            className="bg-gray-800/70 backdrop-blur-md rounded-3xl p-10 md:p-16 text-center border border-gray-700/70 shadow-2xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={{
              hidden: { opacity: 0, scale: 0.9 },
              visible: { opacity: 1, scale: 1, transition: { duration: 0.8 } }
            }}
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
                  Explore Map
                </Button>
              </Link>
              <Link to="/party">
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 hover:from-purple-700 hover:via-pink-600 hover:to-red-600 text-white font-semibold text-lg px-10 transform transition-transform hover:scale-105"
                >
                  Find Parties
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
      <footer className="py-12 md:py-16 border-t border-gray-800 bg-black relative z-10">
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
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 hidden md:block"> {/* Changed bottom-6 to bottom-8 */}
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
