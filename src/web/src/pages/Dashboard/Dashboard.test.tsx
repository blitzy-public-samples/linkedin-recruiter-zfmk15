import React from 'react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@axe-core/react';
import mockWebSocket from 'jest-websocket-mock';

import Dashboard from './Dashboard';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// Mock auth state
const mockAuthState = {
  auth: {
    isAuthenticated: true,
    user: {
      id: 'test-user',
      email: 'test@example.com',
      role: 'recruiter',
      firstName: 'Test',
      lastName: 'User',
      preferences: {
        theme: 'light',
        language: 'en'
      }
    }
  }
};

// Mock analytics data
const mockAnalyticsData = {
  screeningTimeReduction: 75,
  candidateMatchAccuracy: 90,
  costReduction: 50,
  profilesProcessed: 10000,
  averageMatchScore: 84,
  activeSearches: 15,
  lastUpdated: '2023-08-01T12:00:00Z'
};

// Mock WebSocket server
let mockWsServer: mockWebSocket;

describe('Dashboard', () => {
  beforeEach(() => {
    // Set up WebSocket mock
    mockWsServer = new mockWebSocket('ws://localhost:1234');
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock window resize for responsive tests
    global.innerWidth = 1024;
    global.dispatchEvent(new Event('resize'));
  });

  afterEach(() => {
    // Clean up WebSocket mock
    mockWsServer.close();
    
    // Reset viewport size
    global.innerWidth = 1024;
    global.dispatchEvent(new Event('resize'));
  });

  describe('Authentication Flow', () => {
    it('redirects to login when user is not authenticated', () => {
      const { history } = renderWithProviders(<Dashboard />, {
        preloadedState: { auth: { isAuthenticated: false } }
      });

      expect(history.location.pathname).toBe('/login');
    });

    it('renders dashboard content when user is authenticated', () => {
      renderWithProviders(<Dashboard />, {
        preloadedState: mockAuthState
      });

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByText(/Welcome back, Test/i)).toBeInTheDocument();
    });

    it('handles token expiration gracefully', async () => {
      const { store } = renderWithProviders(<Dashboard />, {
        preloadedState: mockAuthState
      });

      // Simulate token expiration
      store.dispatch({ type: 'auth/tokenExpired' });

      await waitFor(() => {
        expect(screen.queryByRole('main')).not.toBeInTheDocument();
      });
    });
  });

  describe('Analytics Display', () => {
    it('displays initial analytics metrics correctly', async () => {
      renderWithProviders(<Dashboard />, {
        preloadedState: mockAuthState
      });

      // Wait for analytics to load
      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument(); // Screening time reduction
        expect(screen.getByText('90%')).toBeInTheDocument(); // Match accuracy
        expect(screen.getByText('50%')).toBeInTheDocument(); // Cost reduction
      });
    });

    it('updates metrics in real-time via WebSocket', async () => {
      renderWithProviders(<Dashboard />, {
        preloadedState: mockAuthState
      });

      // Simulate WebSocket message
      mockWsServer.send({
        type: 'ANALYTICS_UPDATE',
        data: {
          ...mockAnalyticsData,
          screeningTimeReduction: 80
        }
      });

      await waitFor(() => {
        expect(screen.getByText('80%')).toBeInTheDocument();
      });
    });

    it('displays loading state while fetching analytics', () => {
      renderWithProviders(<Dashboard />, {
        preloadedState: mockAuthState
      });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('handles analytics errors gracefully', async () => {
      renderWithProviders(<Dashboard />, {
        preloadedState: mockAuthState
      });

      // Simulate error
      mockWsServer.error();

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 AA standards', async () => {
      const { container } = renderWithProviders(<Dashboard />, {
        preloadedState: mockAuthState
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      renderWithProviders(<Dashboard />, {
        preloadedState: mockAuthState
      });

      const mainContent = screen.getByRole('main');
      
      // Test focus management
      userEvent.tab();
      expect(document.activeElement).toBeInTheDocument();
      
      // Ensure all interactive elements are reachable
      const interactiveElements = within(mainContent).queryAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabindex');
      });
    });

    it('provides proper ARIA labels', () => {
      renderWithProviders(<Dashboard />, {
        preloadedState: mockAuthState
      });

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Dashboard');
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label');
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile viewport (320px)', () => {
      global.innerWidth = 320;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />, {
        preloadedState: mockAuthState
      });

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveStyle({ padding: '16px' });
    });

    it('shows two columns on tablet viewport (768px)', () => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />, {
        preloadedState: mockAuthState
      });

      const gridContainer = screen.getByRole('main').firstChild;
      expect(gridContainer).toHaveStyle({ gridTemplateColumns: 'repeat(2, 1fr)' });
    });

    it('displays full layout on desktop viewport (1024px)', () => {
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<Dashboard />, {
        preloadedState: mockAuthState
      });

      const gridContainer = screen.getByRole('main').firstChild;
      expect(gridContainer).toHaveStyle({ gridTemplateColumns: 'repeat(3, 1fr)' });
    });
  });
});