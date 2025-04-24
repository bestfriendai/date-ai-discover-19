
import React from 'react';
import { motion } from 'framer-motion';
import { CompassIcon } from '@/lib/icons'; // Import from our icons utility

const WelcomeHeader = () => {
  return (
    <motion.div
      // Use left-0 right-0 mx-auto for robust centering
      className="absolute top-4 left-0 right-0 mx-auto z-20 w-full max-w-3xl text-center"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center justify-center gap-3 bg-background/90 backdrop-blur-sm px-6 py-4 rounded-full shadow-lg border border-primary/20 mx-4">
        <CompassIcon className="h-6 w-6 text-primary hidden sm:block" />
        <h1 className="text-lg sm:text-xl font-semibold">
          <span className="text-primary">Events</span> are waiting for you! Click <span className="text-primary">Find my location</span> or enter your location
        </h1>
      </div>
    </motion.div>
  );
};

export default WelcomeHeader;
