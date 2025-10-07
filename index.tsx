import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker.
if ('serviceWorker' in navigator) {
  // Register using the absolute path. This assumes the build process places sw.js in the root of the output directory.
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    })
    .catch(err => {
      console.error('ServiceWorker registration failed: ', err);
    });
}