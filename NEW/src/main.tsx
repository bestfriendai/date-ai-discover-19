import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/globals.css'

// Log application startup
console.log('[APP] Application starting...');

// Create the root and render the app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Complete the app startup measurement when the app is rendered
window.addEventListener('load', () => {
  console.log('[APP] Application loaded');
});
