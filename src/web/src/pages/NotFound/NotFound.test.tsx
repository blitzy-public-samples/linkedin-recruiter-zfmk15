import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { useNavigate } from 'react-router-dom';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import NotFound from './NotFound';
import { theme } from '@mui/material';

// Mock react-router-dom navigation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));

describe('NotFound Page', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    // Mock window.matchMedia for responsive testing
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('should render with correct visual hierarchy following Material Design 3.0', () => {
    const { container } = renderWithProviders(<NotFound />);

    // Verify typography scale
    const heading = screen.getByRole('heading', { level: 1 });
    const subheading = screen.getByRole('heading', { level: 2 });
    const description = screen.getByText(/common.errors.pageNotFoundDescription/i);

    // Check typography styles
    expect(heading).toHaveStyle({
      fontSize: theme.typography.h1.fontSize,
      fontWeight: 700,
      color: theme.palette.primary.main
    });

    expect(subheading).toHaveStyle({
      marginBottom: theme.spacing(3),
      color: theme.palette.text.primary,
      fontWeight: 500
    });

    expect(description).toHaveStyle({
      marginBottom: theme.spacing(4),
      color: theme.palette.text.secondary
    });

    // Verify spacing and layout
    const contentContainer = container.querySelector('[role="main"]');
    expect(contentContainer).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    });
  });

  it('should be fully accessible', async () => {
    const { container } = renderWithProviders(<NotFound />);

    // Check ARIA attributes
    expect(screen.getByRole('main')).toHaveAttribute('aria-labelledby', 'not-found-title');
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('id', 'not-found-title');
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'common.buttons.backToHome');

    // Verify heading hierarchy
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveAttribute('level', '1');
    expect(headings[1]).toHaveAttribute('level', '2');

    // Test keyboard navigation
    const button = screen.getByRole('button');
    button.focus();
    expect(document.activeElement).toBe(button);

    // Run axe accessibility tests
    await expect(container).toHaveNoViolations();
  });

  it('should handle responsive breakpoints correctly', () => {
    const breakpoints = [
      { width: 320, size: 'xs' },
      { width: 768, size: 'sm' },
      { width: 1024, size: 'md' },
      { width: 1440, size: 'lg' }
    ];

    breakpoints.forEach(({ width, size }) => {
      // Mock window resize
      window.innerWidth = width;
      window.dispatchEvent(new Event('resize'));

      const { container } = renderWithProviders(<NotFound />);
      const contentContainer = container.querySelector('[role="main"]');

      // Verify responsive padding
      expect(contentContainer).toHaveStyle({
        padding: size === 'xs' ? theme.spacing(2) : 
                size === 'sm' ? theme.spacing(3) : theme.spacing(4)
      });

      // Verify responsive typography
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveStyle({
        fontSize: size === 'xs' ? '4rem' : '6rem'
      });
    });
  });

  it('should navigate to home page when button is clicked', () => {
    renderWithProviders(<NotFound />);
    
    const button = screen.getByRole('button', { name: /common.buttons.backToHome/i });
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should handle focus management correctly', () => {
    renderWithProviders(<NotFound />);

    const container = screen.getByRole('main');
    const button = screen.getByRole('button');

    // Test focus outline
    button.focus();
    expect(button).toHaveStyle({
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px'
    });

    // Test container focus management
    container.focus();
    expect(container).toHaveAttribute('tabIndex', '-1');
    expect(container).not.toHaveStyle({ outline: 'none' });
  });

  it('should render all required text content', () => {
    renderWithProviders(<NotFound />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/common.errors.notFound/i)).toBeInTheDocument();
    expect(screen.getByText(/common.errors.pageNotFoundDescription/i)).toBeInTheDocument();
    expect(screen.getByText(/common.buttons.backToHome/i)).toBeInTheDocument();
  });
});