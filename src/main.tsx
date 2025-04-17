
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import NetworkMonitor from './utils/networkMonitor'
import PerformanceMonitor from './utils/performanceMonitor'

// Set up global error handlers for better debugging
const originalConsoleError = console.error;
console.error = function(...args) {
  // Call the original console.error
  originalConsoleError.apply(console, args);

  // Log additional information for debugging
  const errorInfo = args.map(arg => {
    if (arg instanceof Error) {
      return {
        message: arg.message,
        stack: arg.stack,
        name: arg.name
      };
    }
    return arg;
  });

  // You could send this to a logging service if needed
  console.log('[GLOBAL ERROR]', JSON.stringify(errorInfo, null, 2));
};

// Handle uncaught errors
window.addEventListener('error', (event) => {
  console.log('[UNCAUGHT ERROR]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error ? {
      message: event.error.message,
      stack: event.error.stack,
      name: event.error.name
    } : null
  });
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.log('[UNHANDLED PROMISE REJECTION]', {
    reason: event.reason instanceof Error ? {
      message: event.reason.message,
      stack: event.reason.stack,
      name: event.reason.name
    } : event.reason
  });
});

// Initialize performance monitoring
console.log('[APP] Initializing performance monitoring');

// Initialize network monitoring
if (typeof window !== 'undefined') {
  try {
    NetworkMonitor.init();
    console.log('[APP] Network monitoring initialized');
  } catch (error) {
    console.error('[APP] Failed to initialize network monitoring:', error);
  }
}

// Log application startup
PerformanceMonitor.startMeasure('appStartup', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  screenSize: `${window.innerWidth}x${window.innerHeight}`,
  devicePixelRatio: window.devicePixelRatio
});

console.log('[APP] Application starting...');

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

  console.log('[APP] Application loaded');
});
