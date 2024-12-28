/**
 * @file SearchForm Component Test Suite
 * @version 1.0.0
 * @description Comprehensive test suite for the SearchForm component validating
 * search functionality, form validation, accessibility, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { axe } from '@axe-core/react';
import { SearchForm } from './SearchForm';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { SearchCriteria } from '../../../types/search.types';

// Mock WebSocket connection
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Mock handlers
const mockSearchHandler = vi.fn();
const mockTemplateHandler = vi.fn();
const mockLiveUpdateHandler = vi.fn();

// Test data
const validSearchCriteria: SearchCriteria = {
  keywords: 'senior software engineer',
  location: 'San Francisco, CA',
  experienceYears: { min: 5, max: 10 },
  requiredSkills: ['React', 'TypeScript', 'Node.js'],
  optionalSkills: ['AWS', 'Docker', 'Kubernetes']
};

const templateData = {
  id: 'template-1',
  name: 'Full Stack Developer',
  criteria: {
    keywords: 'full stack developer',
    location: 'Remote',
    experienceYears: { min: 3, max: 8 },
    requiredSkills: ['JavaScript', 'Python', 'SQL'],
    optionalSkills: ['React', 'Django', 'PostgreSQL']
  }
};

describe('SearchForm Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    // Reset WebSocket mock
    Object.defineProperty(window, 'WebSocket', {
      value: vi.fn(() => mockWebSocket)
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders correctly with all required fields', () => {
    const { container } = renderWithProviders(
      <SearchForm onSubmit={mockSearchHandler} />
    );

    // Verify essential form elements
    expect(screen.getByLabelText(/keywords/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/min experience/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max experience/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/required skills/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/optional skills/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();

    // Verify accessibility
    expect(container).toBeAccessible();
  });

  it('handles form submission with valid data', async () => {
    renderWithProviders(
      <SearchForm 
        onSubmit={mockSearchHandler}
        onLiveUpdate={mockLiveUpdateHandler}
      />
    );

    // Fill form fields
    await user.type(screen.getByLabelText(/keywords/i), validSearchCriteria.keywords);
    await user.type(screen.getByLabelText(/location/i), validSearchCriteria.location!);
    
    // Set experience years
    const minExp = screen.getByLabelText(/min experience/i);
    const maxExp = screen.getByLabelText(/max experience/i);
    await user.type(minExp, validSearchCriteria.experienceYears.min!.toString());
    await user.type(maxExp, validSearchCriteria.experienceYears.max!.toString());

    // Add required skills
    const requiredSkills = screen.getByLabelText(/required skills/i);
    for (const skill of validSearchCriteria.requiredSkills) {
      await user.type(within(requiredSkills).getByRole('textbox'), skill);
      await user.keyboard('{Enter}');
    }

    // Add optional skills
    const optionalSkills = screen.getByLabelText(/optional skills/i);
    for (const skill of validSearchCriteria.optionalSkills) {
      await user.type(within(optionalSkills).getByRole('textbox'), skill);
      await user.keyboard('{Enter}');
    }

    // Submit form
    await user.click(screen.getByRole('button', { name: /search/i }));

    // Verify submission
    await waitFor(() => {
      expect(mockSearchHandler).toHaveBeenCalledWith(validSearchCriteria);
    });
  });

  it('validates required fields and shows error messages', async () => {
    renderWithProviders(<SearchForm onSubmit={mockSearchHandler} />);

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /search/i }));

    // Verify error messages
    expect(await screen.findByText(/keywords are required/i)).toBeInTheDocument();
  });

  it('handles template selection and population', async () => {
    renderWithProviders(
      <SearchForm 
        onSubmit={mockSearchHandler}
        templates={[templateData]}
      />
    );

    // Select template
    const templateSelect = screen.getByLabelText(/search templates/i);
    await user.click(templateSelect);
    await user.click(screen.getByText(templateData.name));

    // Verify template data populated
    await waitFor(() => {
      expect(screen.getByLabelText(/keywords/i)).toHaveValue(templateData.criteria.keywords);
      expect(screen.getByLabelText(/location/i)).toHaveValue(templateData.criteria.location);
    });
  });

  it('handles WebSocket status updates correctly', async () => {
    renderWithProviders(
      <SearchForm 
        onSubmit={mockSearchHandler}
        onLiveUpdate={mockLiveUpdateHandler}
        websocketStatus="CONNECTED"
      />
    );

    // Verify WebSocket status displayed
    expect(screen.getByText(/live updates: connected/i)).toBeInTheDocument();

    // Test live updates
    await user.type(screen.getByLabelText(/keywords/i), 'test');
    
    await waitFor(() => {
      expect(mockLiveUpdateHandler).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('maintains accessibility standards', async () => {
    const { container } = renderWithProviders(
      <SearchForm onSubmit={mockSearchHandler} />
    );

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify keyboard navigation
    const keywordsInput = screen.getByLabelText(/keywords/i);
    await user.tab();
    expect(keywordsInput).toHaveFocus();
  });

  it('handles skill addition and removal', async () => {
    renderWithProviders(<SearchForm onSubmit={mockSearchHandler} />);

    // Add required skill
    const requiredSkills = screen.getByLabelText(/required skills/i);
    await user.type(within(requiredSkills).getByRole('textbox'), 'React');
    await user.keyboard('{Enter}');

    // Verify skill added
    expect(screen.getByText('React')).toBeInTheDocument();

    // Remove skill
    await user.click(screen.getByTitle(/remove React/i));

    // Verify skill removed
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });

  it('debounces live updates appropriately', async () => {
    vi.useFakeTimers();
    
    renderWithProviders(
      <SearchForm 
        onSubmit={mockSearchHandler}
        onLiveUpdate={mockLiveUpdateHandler}
        websocketStatus="CONNECTED"
      />
    );

    // Type rapidly
    const keywordsInput = screen.getByLabelText(/keywords/i);
    await user.type(keywordsInput, 'test query');

    // Fast-forward debounce timer
    vi.advanceTimersByTime(500);

    // Verify debounced update
    expect(mockLiveUpdateHandler).toHaveBeenCalledTimes(1);
  });
});