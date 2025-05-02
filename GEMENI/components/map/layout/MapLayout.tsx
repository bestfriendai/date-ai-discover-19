
import React from 'react';
import Header from '@/components/layout/Header';

interface MapLayoutProps {
  children: React.ReactNode;
}

export const MapLayout = ({ children }: MapLayoutProps) => {
  return (
    <div className="h-screen flex flex-col bg-background overflow-x-hidden">
      <Header />
      <div className="flex-1 flex relative overflow-hidden pt-16">
        {children}
      </div>
    </div>
  );
};
