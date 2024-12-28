import React from 'react'; // v18.0+
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0+
import { vi } from 'vitest'; // v0.34+
import { toHaveStyle, toBeVisible, toHaveClass } from '@testing-library/jest-dom'; // v5.16+
import { axe } from '@axe-core/react'; // v4.7+

import ProfileCard from './ProfileCard';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { Profile } from '../../../types/profile.types';

// Mock profile data
const mockProfile: Profile = {
  id: 'test-id',
  fullName: 'John Doe',
  headline: 'Senior Developer',
  location: 'San Francisco, CA',
  matchScore: 92,
  imageUrl: 'https://example.com/profile.jpg',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  linkedinUrl: 'https://linkedin.com/in/johndoe',
  summary: 'Experienced developer',
  experience: [],
  education: [],
  certifications: [],
  skills: ['React', 'TypeScript'],
  languages: ['English'],
  recommendations: [],
  lastAnalyzedAt: new Date()
};

// Mock handlers
const mockHandlers = {
  onView: vi.fn(),
  onFavorite: vi.fn(),
  onShare: vi.fn(),
  onDismiss: vi.fn()
};

describe('ProfileCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders profile information correctly', () => {
    renderWithProviders(
      <ProfileCard 
        profile={mockProfile}
        {...mockHandlers}
      />
    );

    // Verify profile name
    const name = screen.getByRole('heading', { name: mockProfile.fullName });
    expect(name).toBeVisible();
    expect(name).toHaveStyle({
      fontWeight: 600,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    });

    // Verify headline
    const headline = screen.getByText(mockProfile.headline!);
    expect(headline).toBeVisible();
    expect(headline).toHaveStyle({
      color: expect.any(String) // Text secondary color
    });

    // Verify location with icon
    const location = screen.getByText(mockProfile.location!);
    expect(location).toBeVisible();
    const locationIcon = location.previousElementSibling;
    expect(locationIcon).toHaveAttribute('aria-hidden', 'true');

    // Verify match score
    const score = screen.getByText(`${mockProfile.matchScore}%`);
    expect(score).toBeVisible();
    expect(score.closest('[role="status"]')).toHaveAttribute(
      'aria-label',
      `Match score: ${mockProfile.matchScore}%`
    );

    // Verify action buttons
    const viewButton = screen.getByRole('button', { name: /view profile/i });
    const favoriteButton = screen.getByRole('button', { name: /add.*favorites/i });
    const shareButton = screen.getByRole('button', { name: /share profile/i });

    [viewButton, favoriteButton, shareButton].forEach(button => {
      expect(button).toBeVisible();
      expect(button).toHaveAttribute('aria-label');
    });
  });

  it('handles interactions correctly', async () => {
    renderWithProviders(
      <ProfileCard 
        profile={mockProfile}
        {...mockHandlers}
      />
    );

    // Test button clicks
    const viewButton = screen.getByRole('button', { name: /view profile/i });
    const favoriteButton = screen.getByRole('button', { name: /add.*favorites/i });
    const shareButton = screen.getByRole('button', { name: /share profile/i });

    fireEvent.click(viewButton);
    expect(mockHandlers.onView).toHaveBeenCalledWith(mockProfile.id);

    fireEvent.click(favoriteButton);
    expect(mockHandlers.onFavorite).toHaveBeenCalledWith(mockProfile.id);

    fireEvent.click(shareButton);
    expect(mockHandlers.onShare).toHaveBeenCalledWith(mockProfile.id);

    // Test keyboard interactions
    fireEvent.keyDown(viewButton, { key: 'Enter' });
    expect(mockHandlers.onView).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(favoriteButton, { key: ' ' });
    expect(mockHandlers.onFavorite).toHaveBeenCalledTimes(2);

    // Test hover states
    fireEvent.mouseEnter(viewButton);
    await waitFor(() => {
      expect(screen.getByRole('tooltip', { name: /view profile/i })).toBeVisible();
    });
  });

  it('applies correct styles based on theme', () => {
    const { rerender } = renderWithProviders(
      <ProfileCard 
        profile={mockProfile}
        {...mockHandlers}
      />
    );

    // Test light theme styles
    const card = screen.getByTestId('profile-card');
    expect(card).toHaveStyle({
      backgroundColor: expect.any(String),
      borderRadius: expect.any(String)
    });

    // Test match score colors
    const score = screen.getByText(`${mockProfile.matchScore}%`);
    expect(score.parentElement).toHaveStyle({
      backgroundColor: expect.any(String), // Success color for 90+ score
      color: '#ffffff'
    });

    // Test dark theme styles
    rerender(
      <ProfileCard 
        profile={mockProfile}
        {...mockHandlers}
        className="dark-theme"
      />
    );

    expect(card).toHaveStyle({
      backgroundColor: expect.any(String) // Dark theme background
    });
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithProviders(
      <ProfileCard 
        profile={mockProfile}
        {...mockHandlers}
      />
    );

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA labels and roles
    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      `Profile card for ${mockProfile.fullName}`
    );

    // Test keyboard navigation
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
      button.focus();
      expect(button).toHaveFocus();
    });

    // Verify color contrast
    const score = screen.getByText(`${mockProfile.matchScore}%`);
    const scoreStyles = window.getComputedStyle(score.parentElement!);
    expect(scoreStyles.backgroundColor).toBeDefined();
    expect(scoreStyles.color).toBeDefined();
  });

  it('handles loading and error states', () => {
    renderWithProviders(
      <ProfileCard 
        profile={mockProfile}
        {...mockHandlers}
        isLoading={true}
      />
    );

    // Verify loading skeleton
    const loadingCard = screen.getByTestId('profile-card-loading');
    expect(loadingCard).toBeVisible();
    expect(within(loadingCard).getAllByRole('progressbar')).toHaveLength(7);

    // Verify loading animations
    const skeletons = within(loadingCard).getAllByRole('progressbar');
    skeletons.forEach(skeleton => {
      expect(skeleton).toHaveClass('MuiSkeleton-pulse');
    });
  });

  it('handles responsive layout', () => {
    const { rerender } = renderWithProviders(
      <ProfileCard 
        profile={mockProfile}
        {...mockHandlers}
      />
    );

    // Test default layout
    const card = screen.getByTestId('profile-card');
    expect(card).toHaveStyle({
      padding: expect.any(String)
    });

    // Test mobile layout
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    rerender(
      <ProfileCard 
        profile={mockProfile}
        {...mockHandlers}
      />
    );

    expect(card).toHaveStyle({
      padding: expect.any(String) // Should adjust for mobile
    });
  });
});