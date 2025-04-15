
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background/95 to-background/90">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div 
            className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/3 to-transparent"
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
            className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] p-6 text-center"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <div className="max-w-3xl mx-auto">
              <motion.div 
                variants={itemVariants}
                className="bg-gradient-to-br from-primary to-primary/80 rounded-full w-20 h-20 mx-auto mb-8 flex items-center justify-center shadow-lg shadow-primary/20 ring-2 ring-primary/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </motion.div>
              
              <motion.h1 
                variants={itemVariants}
                className="text-4xl md:text-7xl font-bold mb-6 tracking-tight bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-transparent"
              >
                Find Your Perfect Date <span className="text-primary">Experience</span>
              </motion.h1>
              
              <motion.p 
                variants={itemVariants}
                className="text-lg md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
              >
                Discover unique events, visualize them on a map, and create memorable experiences together.
              </motion.p>
              
              <motion.div 
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Link to="/map">
                  <Button size="lg" className="font-medium text-base px-8 h-12 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    Explore Map
                  </Button>
                </Link>
                <Link to="/plan">
                  <Button size="lg" variant="outline" className="font-medium text-base px-8 h-12">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    Plan a Date
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </section>
        
        {/* Features Section */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">Find and plan the perfect date in three simple steps.</p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  ),
                  title: "Discover Events",
                  description: "Find events and activities happening in your area."
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  ),
                  title: "Save Favorites",
                  description: "Bookmark events that catch your interest."
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  ),
                  title: "Plan Your Date",
                  description: "Create a perfect itinerary from your saved events."
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="relative p-6 rounded-2xl border bg-gradient-to-b from-card/50 to-card hover:shadow-lg transition-shadow"
                >
                  <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="bg-primary rounded-full p-1.5 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </div>
              <span className="font-semibold text-lg">DateAI</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} DateAI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
