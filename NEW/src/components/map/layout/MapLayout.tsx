import React from 'react';

interface MapLayoutProps {
  children: React.ReactNode;
}

export const MapLayout: React.FC<MapLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
    </div>
  );
};
