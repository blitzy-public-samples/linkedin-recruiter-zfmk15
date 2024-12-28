import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux'; // v8.1+
import { PersistGate } from 'redux-persist/integration/react'; // v6.0+
import { ThemeProvider } from '@mui/material'; // v5.14+
import { ErrorBoundary } from 'react-error-boundary'; // v4.0+

import App from './App';
import { store, persistor } from './store/store';
import createAppTheme from './config/theme.config';
import { logError, ErrorSeverity } from './utils/errorHandling';

// Root element ID for app mounting
const ROOT_ELEMENT_ID = 'root';

/**
 * Initialize application prerequisites including browser compatibility checks
 * and performance monitoring
 */
const initializeApp = (): void => {
  // Enable React strict mode in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Running in development mode with strict mode enabled');
  }

  // Initialize performance monitoring
  if ('performance' in window && 'measure' in window.performance) {
    performance.mark('app-init-start');
  }

  // Setup error tracking
  window.addEventListener('error', (event) => {
    logError(event.error, 'Global Error Handler', {
      severity: ErrorSeverity.HIGH,
      securityContext: {
        location: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Setup unhandled promise rejection tracking
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, 'Unhandled Promise Rejection', {
      severity: ErrorSeverity.HIGH,
      securityContext: {
        timestamp: new Date().toISOString()
      }
    });
  });
};

/**
 * Error Fallback component for the root error boundary
 */
const RootErrorFallback = ({ error }: { error: Error }) => {
  React.useEffect(() => {
    logError(error, 'Root Error Boundary', {
      severity: ErrorSeverity.CRITICAL
    });
  }, [error]);

  return (
    <div role="alert" aria-live="assertive">
      <h1>Application Error</h1>
      <p>We're sorry, but something went wrong. Please try refreshing the page.</p>
      {process.env.NODE_ENV === 'development' && (
        <pre style={{ whiteSpace: 'pre-wrap' }}>{error.stack}</pre>
      )}
    </div>
  );
};

/**
 * Renders the root application with all required providers and error boundaries
 */
const renderApp = (): void => {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  
  if (!rootElement) {
    throw new Error(`Root element with id "${ROOT_ELEMENT_ID}" not found`);
  }

  // Create React root with concurrent features
  const root = ReactDOM.createRoot(rootElement);

  // Get initial theme based on system preference
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = createAppTheme(prefersDarkMode ? 'dark' : 'light');

  // Render application with all providers
  root.render(
    <React.StrictMode>
      <ErrorBoundary FallbackComponent={RootErrorFallback}>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <ThemeProvider theme={theme}>
              <App />
            </ThemeProvider>
          </PersistGate>
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Mark application render complete
  if ('performance' in window && 'measure' in window.performance) {
    performance.mark('app-init-end');
    performance.measure('app-initialization', 'app-init-start', 'app-init-end');
  }
};

// Initialize and render application
try {
  initializeApp();
  renderApp();
} catch (error) {
  logError(error as Error, 'Application Initialization Failed', {
    severity: ErrorSeverity.CRITICAL
  });
  
  // Render minimal error state
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  if (rootElement) {
    rootElement.innerHTML = `
      <div role="alert">
        <h1>Critical Error</h1>
        <p>The application failed to initialize. Please try refreshing the page.</p>
      </div>
    `;
  }
}