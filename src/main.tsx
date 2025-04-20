import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import NetworkMonitor from './utils/networkMonitor'
import PerformanceMonitor from './utils/performanceMonitor'
import errorReporter from './utils/errorReporter'

// Set up global error handlers for better debugging
window.addEventListener('error', (event) => {
  errorReporter('[UNCAUGHT ERROR]', {
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

window.addEventListener('unhandledrejection', (event) => {
  errorReporter('[UNHANDLED PROMISE REJECTION]', {
    reason: event.reason instanceof Error ? {
      message: event.reason.message,
      stack: event.reason.stack,
      name: event.reason.name
    } : event.reason
  });
});

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
