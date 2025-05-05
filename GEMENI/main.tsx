import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import './styles/globals.css'
import NetworkMonitor from './utils/networkMonitor'
import PerformanceMonitor from './utils/performanceMonitor'
import errorReporter, { ErrorContext } from './utils/errorReporter'
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Make toast globally available for error reporting
declare global {
  interface Window {
    toast?: typeof toast;
    supabase?: typeof supabase;
  }
}
if (typeof window !== 'undefined') {
  window.toast = toast;
  window.supabase = supabase;
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
  errorReporter('[APP] Failed to initialize network monitoring:', error as ErrorContext);
}

// Log application startup
PerformanceMonitor.startMeasure('appStartup', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  screenSize: `${window.innerWidth}x${window.innerHeight}`,
  devicePixelRatio: window.devicePixelRatio
});

originalConsoleLog('[APP] Application starting...');

// Initialize API key manager and secrets service
import { initApiKeyManager } from '@/utils/apiKeyManager';
import { initSecretsService } from '@/services/secretsService';

// Check if the Supabase client is initialized correctly
console.log('[APP] Checking Supabase client initialization...');
if (supabase) {
  console.log('[APP] Supabase client is initialized');
} else {
  console.error('[APP] Supabase client is not initialized!');
}

// Create the root and render the app
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('[APP] Root element not found!');
  document.body.innerHTML = '<div style="color: white; padding: 20px; text-align: center; font-family: sans-serif;"><h1>Error: Root element not found</h1><p>Please check the HTML structure and make sure there is an element with id "root".</p></div>';
} else {
  console.log('[APP] Root element found, creating React root');
  const root = createRoot(rootElement);

  // Initialize secrets service and API key manager before rendering
  (async () => {
    try {
      // Initialize secrets service first
      await initSecretsService();
      originalConsoleLog('[APP] Secrets service initialized');

      // Then initialize API key manager
      await initApiKeyManager();
      originalConsoleLog('[APP] API key manager initialized');

      // Render the app
      originalConsoleLog('[APP] Rendering application...');
      root.render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      originalConsoleLog('[APP] Application rendered');
    } catch (error) {
      errorReporter('[APP] Failed to initialize services:', error as ErrorContext);
      // Render the app anyway to avoid blank screen
      originalConsoleLog('[APP] Rendering application despite initialization errors...');
      root.render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
    }
  })();
}

// Complete the app startup measurement when the app is loaded
window.addEventListener('load', () => {
  // End the app startup measurement
  PerformanceMonitor.endMeasure('appStartup', {
    loadTime: performance.now(),
    timestamp: new Date().toISOString()
  });

  originalConsoleLog('[APP] Application loaded');
});
