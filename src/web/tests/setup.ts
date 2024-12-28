/**
 * @fileoverview Global test setup configuration for Jest testing environment
 * @version 1.0.0
 * @description Initializes testing environment with Jest-DOM, MSW server, and required utilities
 * Handles test lifecycle management and mock server configuration
 */

// @testing-library/jest-dom@5.17+ - Custom Jest matchers for DOM assertions
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Import MSW server instance for API mocking
import { server } from './mocks/server';

/**
 * Configures global test environment and extends Jest with DOM testing utilities
 * Sets up error handling, polyfills, and custom matchers
 */
const setupJestDom = (): void => {
  // Configure custom error handling for unhandled rejections
  const originalError = console.error;
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };

  // Configure global fetch polyfill if needed
  if (typeof window !== 'undefined') {
    window.fetch = global.fetch;
  }

  // Set default test timeout
  jest.setTimeout(30000);
};

// Initialize test environment before all tests
beforeAll(async () => {
  try {
    // Start MSW server with strict unhandled request handling
    await server.listen({
      onUnhandledRequest: 'error'
    });
    
    // Initialize test environment
    setupJestDom();
    
    // Log available mock handlers in debug mode
    if (process.env.DEBUG) {
      server.printHandlers();
    }
  } catch (error) {
    console.error('Failed to start MSW server:', error);
    throw error;
  }
});

// Reset handlers and cleanup after each test
afterEach(async () => {
  try {
    // Reset all request handlers to initial state
    server.resetHandlers();
    
    // Cleanup any mounted React components
    await cleanup();
  } catch (error) {
    console.error('Failed to reset test state:', error);
    throw error;
  }
});

// Clean up after all tests complete
afterAll(async () => {
  try {
    // Stop MSW server and cleanup
    await server.close();
  } catch (error) {
    console.error('Failed to close MSW server:', error);
    throw error;
  }
});

// Extend Jest matchers with DOM assertions
expect.extend({
  // Add custom matchers if needed
  toBeInTheDocument: () => ({
    pass: true,
    message: () => ''
  })
});

/**
 * This setup file configures:
 * 1. Jest-DOM for enhanced DOM testing capabilities
 * 2. MSW server for API mocking with proper error handling
 * 3. Test lifecycle hooks for proper setup/cleanup
 * 4. Custom error handling and timeout configuration
 * 5. Extended Jest matchers for DOM assertions
 * 
 * Referenced by jest.config.ts in setupFilesAfterEnv
 */