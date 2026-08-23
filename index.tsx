
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HuddleProvider } from './src/context/HuddleContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HuddleProvider>
      <App />
    </HuddleProvider>
  </React.StrictMode>
);
