/**
 * @fileoverview Mock Service Worker (MSW) server configuration for frontend testing
 * @version 1.0.0
 * @description Configures and exports an MSW server instance for intercepting API requests
 * during testing. Provides a robust testing infrastructure for simulating backend responses.
 */

// msw@1.2.0 - Mock Service Worker server setup utility
import { setupServer } from 'msw/node';

// Import mock request handlers for different API endpoints
import { handlers } from './handlers';

/**
 * Creates and configures an MSW server instance with all mock API handlers
 * Combines authentication, search, and profile handlers into a single server instance
 * 
 * @returns {SetupServer} Configured MSW server instance ready for test usage
 */
const createMockServer = () => {
  // Initialize server with all mock request handlers
  const server = setupServer(...handlers);

  return server;
};

// Create and export the configured server instance
export const server = createMockServer();

/**
 * Server instance provides the following methods for test lifecycle management:
 * - server.listen() - Start the server and begin intercepting requests
 * - server.close() - Stop the server and clean up
 * - server.resetHandlers() - Reset handlers to initial state
 * - server.use() - Temporarily override handlers for specific tests
 */