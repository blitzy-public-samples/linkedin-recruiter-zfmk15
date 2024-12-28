/**
 * @file Test Utilities for React Components
 * @version 1.0.0
 * @description Provides comprehensive testing utilities for React components with Redux store integration,
 * React Testing Library, routing, and accessibility testing support
 */

import React, { PropsWithChildren } from 'react';
import { render, RenderOptions, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { PreloadedState, configureStore, Middleware } from '@reduxjs/toolkit';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { toHaveNoViolations, axe } from 'jest-axe';
import { RootState, AppDispatch } from '../../src/store/store';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

/**
 * Interface for extended render options including Redux store configuration
 */
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: PreloadedState<RootState>;
  route?: string;
  initialEntries?: string[];
  middlewares?: Middleware[];
}

/**
 * Interface for test store configuration
 */
interface TestStoreConfig {
  preloadedState?: PreloadedState<RootState>;
  middlewares?: Middleware[];
  cleanupCallback?: () => void;
}

/**
 * Creates a configured Redux store instance for testing
 * @param config Store configuration options
 */
export const createTestStore = (config: TestStoreConfig = {}) => {
  const { preloadedState, middlewares = [], cleanupCallback } = config;

  // Create store with provided state and middlewares
  const store = configureStore({
    reducer: {
      auth: authReducer,
      search: searchReducer,
      profile: profileReducer,
      ui: uiReducer
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        thunk: true
      }).concat(middlewares)
  });

  // Setup cleanup
  if (cleanupCallback) {
    store.subscribe(cleanupCallback);
  }

  return store;
};

/**
 * Enhanced render function that wraps components with necessary providers
 * @param ui Component to render
 * @param options Render configuration options
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    route = '/',
    initialEntries = ['/'],
    middlewares = [],
    ...renderOptions
  }: ExtendedRenderOptions = {}
) => {
  // Create test store
  const store = createTestStore({
    preloadedState,
    middlewares
  });

  // Wrap component with providers
  function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </Provider>
    );
  }

  // Render with enhanced utilities
  const rendered = render(ui, { wrapper: Wrapper, ...renderOptions });

  // Add custom utilities
  const customUtilities = {
    store,
    dispatch: store.dispatch as AppDispatch,
    getState: store.getState,
    // Enhanced queries
    findByTestId: async (id: string) => {
      return await rendered.findByTestId(id);
    },
    getAllByRole: (role: string) => {
      return rendered.getAllByRole(role);
    },
    // Accessibility testing
    async checkAccessibility() {
      const results = await axe(rendered.container);
      expect(results).toHaveNoViolations();
    },
    // Route testing
    navigate(path: string) {
      window.history.pushState({}, '', path);
    }
  };

  return {
    ...rendered,
    ...customUtilities
  };
};

/**
 * Utility to properly cleanup test store subscriptions and state
 */
export const cleanupTestStore = (store: ReturnType<typeof createTestStore>) => {
  // Unsubscribe all listeners
  store.dispatch({ type: 'CLEANUP_TEST_STORE' });
  
  // Clear store state
  store.dispatch({ type: 'RESET_STATE' });
  
  // Clear any pending timeouts/intervals
  jest.clearAllTimers();
};

// Export type-safe hooks for testing
export type RenderResult = ReturnType<typeof renderWithProviders>;
export type TestStore = ReturnType<typeof createTestStore>;

// Export common test utilities
export {
  screen,
  within,
  fireEvent,
  waitFor
};