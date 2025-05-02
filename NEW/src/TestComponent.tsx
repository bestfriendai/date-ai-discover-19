import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
        DateAI - NEW Implementation
      </h1>
      <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-md text-center">
        The application is working! This is a test component.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button className="py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg transition-colors shadow-lg">
          Test Button
        </button>
      </div>
    </div>
  );
};

export default TestComponent;
