
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const Index = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white overflow-x-hidden">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-purple-500/5 to-transparent"
            style={{
              zIndex: 0
            }}
          />
          
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z'/%3E%3C/g%3E%3C/svg%3E")`,
              zIndex: 1
            }}
          />
          
          {/* Hero Content */}
          <motion.div
            className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] sm:min-h-[90vh] p-4 sm:p-6 text-center"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <div className="max-w-full sm:max-w-3xl mx-auto px-2">
              <motion.div 
                variants={itemVariants}
                className="bg-gradient-to-br from-primary to-primary/80 rounded-full w-20 h-20 mx-auto mb-8 flex items-center justify-center shadow-lg shadow-primary/20 ring-2 ring-primary/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </motion.div>
              
              <motion.h1 
                variants={itemVariants}
                className="text-3xl xs:text-4xl md:text-7xl font-bold mb-6 tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent leading-tight"
              >
                Find Your Perfect Date <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Experience</span>
              </motion.h1>
              
              <motion.p 
                variants={itemVariants}
                className="text-base xs:text-lg md:text-2xl text-blue-100/80 mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed"
              >
                Discover unique events, visualize them on a map, and create memorable experiences together.
              </motion.p>
              
              <motion.div 
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full"
              >
                <Link to="/map">
                  <Button 
                    size="lg" 
                    className="font-medium text-base px-8 sm:px-10 h-14 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all transform hover:scale-105"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    Explore Map
                  </Button>
                </Link>
                <Link to="/plan">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="font-medium text-base px-8 sm:px-10 h-14 w-full sm:w-auto border-blue-400 text-blue-100 hover:bg-blue-500/10 rounded-full transition-all transform hover:scale-105"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    Plan a Date
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </section>
        
        {/* Features Section */}
        <section className="py-12 xs:py-16 sm:py-20 md:py-24 px-2 xs:px-4 sm:px-6 bg-gradient-to-b from-slate-900 to-slate-800">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center mb-10 md:mb-16"
            >
              <h2 className="text-2xl xs:text-3xl font-bold mb-3 xs:mb-4 bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">How It Works</h2>
              <p className="text-blue-100/70 max-w-lg mx-auto text-base xs:text-lg">Find and plan the perfect date in three simple steps.</p>
            </motion.div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  ),
                  title: "Discover Events",
                  description: "Find events and activities happening in your area.",
                  gradient: "from-blue-500 to-blue-600"
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  ),
                  title: "Save Favorites",
                  description: "Bookmark events that catch your interest.",
                  gradient: "from-purple-500 to-purple-600"
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  ),
                  title: "Plan Your Date",
                  description: "Create a perfect itinerary from your saved events.",
                  gradient: "from-pink-500 to-pink-600"
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="relative p-6 xs:p-8 rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all transform hover:scale-105 overflow-hidden"
                >
                  {/* Gradient accent */}
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${feature.gradient} opacity-10 blur-2xl`}></div>
                  
                  <div className={`bg-gradient-to-br ${feature.gradient} w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/10`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                  <p className="text-blue-100/70">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t border-slate-800/80 py-6 xs:py-8 bg-slate-900">
        <div className="container mx-auto px-2 xs:px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center mb-3 md:mb-0">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-1.5 mr-2 shadow-lg shadow-blue-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </div>
              <span className="font-semibold text-base xs:text-lg bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">DateAI</span>
            </div>
            
            <div className="flex gap-6">
              <a href="#" className="text-blue-300/80 hover:text-blue-300 transition-colors">Terms</a>
              <a href="#" className="text-blue-300/80 hover:text-blue-300 transition-colors">Privacy</a>
              <a href="#" className="text-blue-300/80 hover:text-blue-300 transition-colors">Contact</a>
            </div>
            
            <div className="text-xs xs:text-sm text-blue-100/50 text-center md:text-left">
              &copy; {new Date().getFullYear()} DateAI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
