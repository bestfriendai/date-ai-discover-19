
import React from 'react';

const WelcomeHeader = () => {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-2xl text-center">
      <h1 className="text-xl font-semibold text-white bg-background/80 backdrop-blur-sm px-6 py-3 rounded-full inline-block shadow-lg border border-border/50">
        Events are waiting for you, click the find my location button or enter your location
      </h1>
    </div>
  );
};

export default WelcomeHeader;
