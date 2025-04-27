import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import './styles/globals.css'
import NetworkMonitor from './utils/networkMonitor'
import PerformanceMonitor from './utils/performanceMonitor'
import errorReporter from './utils/errorReporter'
import { toast } from '@/hooks/use-toast';

// Make toast globally available for error reporting
declare global {
  interface Window {
    toast?: typeof toast;
  }
}
if (typeof window !== 'undefined') {
  window.toast = toast;
}

// --- ENHANCED ERROR LOGGING FOR BROWSER ---
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Log full error details to the browser console
    console.error('[Global Error]', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      stack: event.error?.stack,
    });
    // Optionally, show a detailed toast for the user
    if (window?.toast) {
      window.toast({
        title: 'A JavaScript error occurred',
        description: `${event.message} in ${event.filename}:${event.lineno}:${event.colno}`,
        variant: 'destructive',
        duration: 8000,
      });
    }
  });
  window.addEventListener('unhandledrejection', (event) => {
    // Log full promise rejection details
    console.error('[Unhandled Promise Rejection]', {
      reason: event.reason,
      stack: event.reason?.stack,
    });
    if (window?.toast) {
      window.toast({
        title: 'Unhandled Promise Rejection',
        description: event.reason?.message || String(event.reason),
        variant: 'destructive',
        duration: 8000,
      });
    }
  });
}

// Original console methods to avoid circular references
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Initialize performance monitoring
originalConsoleLog('[APP] Initializing performance monitoring');

// Initialize network monitoring
try {
  NetworkMonitor.init();
  console.log('[APP] Network monitoring initialized');
} catch (error) {
  errorReporter('[APP] Failed to initialize network monitoring:', error);
}

// Log application startup
PerformanceMonitor.startMeasure('appStartup', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  screenSize: `${window.innerWidth}x${window.innerHeight}`,
  devicePixelRatio: window.devicePixelRatio
});

originalConsoleLog('[APP] Application starting...');

// Create the root and render the app
const root = createRoot(document.getElementById("root")!);

// Render the app
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// Complete the app startup measurement when the app is rendered
window.addEventListener('load', () => {
  // End the app startup measurement
  PerformanceMonitor.endMeasure('appStartup', {
    loadTime: performance.now(),
    timestamp: new Date().toISOString()
  });

  originalConsoleLog('[APP] Application loaded');
});
