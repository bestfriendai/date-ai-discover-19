import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Dark gradient overlay */}
          <div 
            className="absolute inset-0 bg-gradient-to-b from-transparent via-background/90 to-background"
            style={{
              backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.9))',
              zIndex: 1
            }}
          ></div>
          
          {/* Map Background */}
          <div className="absolute inset-0 bg-gray-900">
            <iframe 
              src="/map" 
              className="w-full h-full opacity-50 pointer-events-none"
              title="Background Map"
            ></iframe>
          </div>
          
          {/* Hero Content */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] p-6 text-center">
            <div className="max-w-3xl mx-auto">
              <div className="bg-primary rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                Discover<span className="text-primary">.</span> Plan<span className="text-primary">.</span> Experience<span className="text-primary">.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Find the perfect events for your next date, visualize them on a map, and create custom itineraries.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/map">
                  <Button size="lg" className="font-medium">
                    Explore Map
                  </Button>
                </Link>
                <Link to="/plan">
                  <Button size="lg" variant="outline" className="font-medium">
                    Plan a Date
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How DateAI Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-muted w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Discover Events</h3>
                <p className="text-muted-foreground">Find events in your area or any location you're interested in.</p>
              </div>
              
              <div className="text-center">
                <div className="bg-muted w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Save Favorites</h3>
                <p className="text-muted-foreground">Bookmark events that catch your interest to revisit later.</p>
              </div>
              
              <div className="text-center">
                <div className="bg-muted w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Create Plans</h3>
                <p className="text-muted-foreground">Build custom date itineraries from your favorite events.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center">
                <div className="bg-primary rounded-full p-1 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </div>
                <span className="font-bold">DateAI</span>
              </div>
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
