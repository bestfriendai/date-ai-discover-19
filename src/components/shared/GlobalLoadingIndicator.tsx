import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';

// Create a global event system for loading state
type LoadingEvent = {
  id: string;
  message?: string;
};

// Global loading state manager
class LoadingStateManager {
  private static instance: LoadingStateManager;
  private loadingStates: Map<string, LoadingEvent>;
  private listeners: Set<(loadingStates: Map<string, LoadingEvent>) => void>;

  private constructor() {
    this.loadingStates = new Map();
    this.listeners = new Set();
  }

  public static getInstance(): LoadingStateManager {
    if (!LoadingStateManager.instance) {
      LoadingStateManager.instance = new LoadingStateManager();
    }
    return LoadingStateManager.instance;
  }

  public startLoading(id: string, message?: string): void {
    this.loadingStates.set(id, { id, message });
    this.notifyListeners();
  }

  public stopLoading(id: string): void {
    this.loadingStates.delete(id);
    this.notifyListeners();
  }

  public isLoading(): boolean {
    return this.loadingStates.size > 0;
  }

  public getLoadingStates(): Map<string, LoadingEvent> {
    return new Map(this.loadingStates);
  }

  public subscribe(listener: (loadingStates: Map<string, LoadingEvent>) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.getLoadingStates());
    }
  }
}

// Export the singleton instance
export const loadingManager = LoadingStateManager.getInstance();

// Hook to use the loading manager
export function useLoading() {
  const [isLoading, setIsLoading] = useState(loadingManager.isLoading());
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingEvent>>(
    loadingManager.getLoadingStates()
  );

  useEffect(() => {
    const unsubscribe = loadingManager.subscribe((states) => {
      setIsLoading(states.size > 0);
      setLoadingStates(states);
    });
    return unsubscribe;
  }, []);

  return {
    isLoading,
    loadingStates,
    startLoading: loadingManager.startLoading.bind(loadingManager),
    stopLoading: loadingManager.stopLoading.bind(loadingManager),
  };
}

// Loading indicator component
interface GlobalLoadingIndicatorProps {
  className?: string;
  fullScreen?: boolean;
}

export function GlobalLoadingIndicator({ 
  className, 
  fullScreen = false 
}: GlobalLoadingIndicatorProps) {
  const { isLoading, loadingStates } = useLoading();
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  // Find or create portal element
  useEffect(() => {
    let element = document.getElementById('loading-portal');
    if (!element) {
      element = document.createElement('div');
      element.id = 'loading-portal';
      document.body.appendChild(element);
    }
    setPortalElement(element);

    return () => {
      if (element && element.parentElement && !element.childElementCount) {
        element.parentElement.removeChild(element);
      }
    };
  }, []);

  if (!isLoading || !portalElement) return null;

  // Get the latest loading message
  const latestLoadingEvent = Array.from(loadingStates.values()).pop();
  const message = latestLoadingEvent?.message;

  const content = (
    <div
      className={cn(
        'fixed z-50 flex items-center justify-center',
        fullScreen ? 'inset-0 bg-background/80 backdrop-blur-sm' : 'bottom-4 right-4',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg bg-background p-4 shadow-lg',
          fullScreen ? 'flex-col' : 'flex-row'
        )}
      >
        <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
        {message && <p className="text-sm font-medium">{message}</p>}
      </div>
    </div>
  );

  return createPortal(content, portalElement);
}

export default GlobalLoadingIndicator;