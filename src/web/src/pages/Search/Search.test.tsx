/**
 * @file Search Page Component Tests
 * @version 1.0.0
 * @description Comprehensive test suite for the Search page component implementing
 * test coverage for search functionality, results display, real-time updates,
 * accessibility, and performance
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { axe } from '@axe-core/react';

import { Search } from './Search';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { handlers } from '../../../tests/mocks/handlers';
import { SearchStatus, WebSocketStatus } from '../../types/search.types';

// Setup MSW server
const server = setupServer(...handlers);

// Mock search results data
const mockSearchResults = {
  id: 'search-1',
  profiles: [
    {
      id: 'profile-1',
      fullName: 'John Developer',
      headline: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      matchScore: 92,
      isActive: true
    }
  ],
  totalCount: 1,
  page: 0,
  pageSize: 20
};

describe('Search Page', () => {
  beforeEach(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  describe('Search Form', () => {
    it('should render search form with all required fields', () => {
      renderWithProviders(<Search />);

      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getByLabelText(/keywords/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/required skills/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    it('should validate required fields before submission', async () => {
      renderWithProviders(<Search />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await userEvent.click(searchButton);

      expect(await screen.findByText(/keywords are required/i)).toBeInTheDocument();
    });

    it('should handle boolean search operators correctly', async () => {
      const { store } = renderWithProviders(<Search />);
      
      const keywordsInput = screen.getByLabelText(/keywords/i);
      await userEvent.type(keywordsInput, 'React AND (Node.js OR Python)');
      await userEvent.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        expect(store.getState().search.status).toBe(SearchStatus.SEARCHING);
      });
    });

    it('should handle skill selection and removal', async () => {
      renderWithProviders(<Search />);
      
      const skillsInput = screen.getByLabelText(/required skills/i);
      await userEvent.type(skillsInput, 'React{enter}');
      await userEvent.type(skillsInput, 'Node.js{enter}');

      const skills = screen.getAllByRole('button', { name: /remove/i });
      expect(skills).toHaveLength(2);

      await userEvent.click(skills[0]);
      expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
    });
  });

  describe('Results Display', () => {
    it('should display search results in a grid layout', async () => {
      const { store } = renderWithProviders(<Search />);
      store.dispatch({ type: 'search/updateResults', payload: mockSearchResults });

      const resultsGrid = screen.getByRole('region', { name: /search results/i });
      expect(resultsGrid).toBeInTheDocument();
      expect(within(resultsGrid).getAllByRole('article')).toHaveLength(1);
    });

    it('should handle sorting of results', async () => {
      const { store } = renderWithProviders(<Search />);
      store.dispatch({ type: 'search/updateResults', payload: mockSearchResults });

      const sortSelect = screen.getByLabelText(/sort results by/i);
      await userEvent.selectOptions(sortSelect, 'MATCH_SCORE');

      await waitFor(() => {
        expect(store.getState().search.sortField).toBe('MATCH_SCORE');
      });
    });

    it('should implement pagination correctly', async () => {
      const { store } = renderWithProviders(<Search />);
      store.dispatch({ 
        type: 'search/updateResults', 
        payload: { ...mockSearchResults, totalCount: 50 } 
      });

      const pagination = screen.getByRole('navigation', { name: /pagination/i });
      const nextButton = within(pagination).getByRole('button', { name: /next/i });
      
      await userEvent.click(nextButton);
      expect(store.getState().search.currentPage).toBe(1);
    });
  });

  describe('Real-time Updates', () => {
    it('should handle WebSocket connection status', async () => {
      const { store } = renderWithProviders(<Search />);
      
      store.dispatch({ 
        type: 'search/updateWebSocketStatus', 
        payload: WebSocketStatus.CONNECTED 
      });

      expect(screen.queryByText(/real-time updates unavailable/i)).not.toBeInTheDocument();

      store.dispatch({ 
        type: 'search/updateWebSocketStatus', 
        payload: WebSocketStatus.ERROR 
      });

      expect(screen.getByText(/real-time updates unavailable/i)).toBeInTheDocument();
    });

    it('should update results in real-time when profiles are found', async () => {
      const { store } = renderWithProviders(<Search />);
      
      // Simulate initial search
      store.dispatch({ type: 'search/updateResults', payload: mockSearchResults });

      // Simulate real-time profile match
      const newProfile = {
        id: 'profile-2',
        fullName: 'Jane Engineer',
        matchScore: 95
      };

      store.dispatch({ 
        type: 'search/handleSearchUpdate', 
        payload: {
          status: SearchStatus.SEARCHING,
          data: {
            profiles: [newProfile],
            totalCount: 2
          }
        }
      });

      await waitFor(() => {
        expect(screen.getAllByRole('article')).toHaveLength(2);
      });
    });
  });

  describe('Accessibility', () => {
    it('should pass accessibility audit', async () => {
      const { container } = renderWithProviders(<Search />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<Search />);
      
      const searchForm = screen.getByRole('search');
      const keywordsInput = screen.getByLabelText(/keywords/i);

      // Test keyboard navigation
      await userEvent.tab();
      expect(keywordsInput).toHaveFocus();

      await userEvent.keyboard('{Tab}');
      expect(screen.getByLabelText(/location/i)).toHaveFocus();
    });

    it('should announce search status changes', async () => {
      const { store } = renderWithProviders(<Search />);
      
      // Simulate search start
      store.dispatch({ type: 'search/setSearchStatus', payload: SearchStatus.SEARCHING });
      expect(screen.getByRole('status')).toHaveTextContent(/searching/i);

      // Simulate search completion
      store.dispatch({ type: 'search/updateResults', payload: mockSearchResults });
      expect(screen.getByRole('status')).toHaveTextContent(/1 profiles? found/i);
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      jest.useFakeTimers();
      const { store } = renderWithProviders(<Search />);
      
      const keywordsInput = screen.getByLabelText(/keywords/i);
      await userEvent.type(keywordsInput, 'React Developer');

      // Fast typing shouldn't trigger immediate searches
      expect(store.getState().search.status).not.toBe(SearchStatus.SEARCHING);

      // Wait for debounce
      jest.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(store.getState().search.status).toBe(SearchStatus.SEARCHING);
      });

      jest.useRealTimers();
    });

    it('should handle error states gracefully', async () => {
      const { store } = renderWithProviders(<Search />);
      
      store.dispatch({ 
        type: 'search/setError', 
        payload: 'Failed to connect to search service' 
      });

      expect(screen.getByRole('alert')).toHaveTextContent(/failed to connect/i);
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});