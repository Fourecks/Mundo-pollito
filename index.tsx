
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HuddleProvider } from './src/context/HuddleContext';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-6 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 text-center space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-bold">Ocurrió un error inesperado</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 overflow-auto max-h-32 p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 text-left font-mono">
              {this.state.error?.message || 'Error desconocido'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-colors text-sm"
            >
              Cargar de nuevo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <HuddleProvider>
        <App />
      </HuddleProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

