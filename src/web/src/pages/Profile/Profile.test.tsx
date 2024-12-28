/**
 * @file Profile Page Component Test Suite v1.0.0
 * @description Comprehensive tests for Profile page component covering data display,
 * analysis functionality, accessibility, and real-time updates
 */

import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@axe-core/react';
import { vi } from 'vitest';
import ProfilePage from './Profile';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import { useProfile } from '../../hooks/useProfile';
import { useWebSocket } from '../../hooks/useWebSocket';

// Mock hooks
vi.mock('../../hooks/useProfile');
vi.mock('../../hooks/useWebSocket');
vi.mock('react-router-dom', () => ({
  useParams: () => ({ profileId: 'test-id' }),
  useNavigate: () => vi.fn()
}));

// Mock profile data
const mockProfile = {
  id: 'test-id',
  fullName: 'John Doe',
  headline: 'Senior Software Engineer',
  location: 'San Francisco, CA',
  matchScore: 92,
  experience: [
    {
      id: 'exp-1',
      companyName: 'Tech Corp',
      title: 'Senior Developer',
      startDate: new Date('2020-01-01'),
      endDate: null,
      description: 'Leading development team',
      location: 'San Francisco, CA',
      skills: ['React', 'TypeScript', 'Node.js'],
      highlights: ['Increased performance by 50%']
    }
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Tech University',
      degree: 'BS Computer Science',
      fieldOfStudy: 'Computer Science',
      startDate: new Date('2014-09-01'),
      endDate: new Date('2018-05-01'),
      grade: '3.8 GPA',
      activities: ['Programming Club']
    }
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'AWS Solutions Architect',
      issuingOrganization: 'Amazon',
      issueDate: new Date('2021-01-01'),
      expirationDate: new Date('2024-01-01'),
      credentialId: 'AWS-123'
    }
  ],
  lastAnalyzedAt: new Date('2023-01-01')
};

describe('Profile Page', () => {
  // Set up test environment
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock useProfile hook with default state
    (useProfile as jest.Mock).mockReturnValue({
      profile: mockProfile,
      loading: { fetch: false, analysis: false },
      error: null,
      analysisProgress: 0,
      isCached: false,
      operations: {
        fetchProfile: vi.fn(),
        triggerAnalysis: vi.fn(),
        refreshProfile: vi.fn()
      }
    });

    // Mock useWebSocket hook
    (useWebSocket as jest.Mock).mockReturnValue({
      isConnected: true,
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    });
  });

  // Clean up after tests
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Profile Data Display', () => {
    test('renders profile header with name and headline', () => {
      renderWithProviders(<ProfilePage />);

      expect(screen.getByRole('heading', { name: mockProfile.fullName })).toBeInTheDocument();
      expect(screen.getByText(mockProfile.headline)).toBeInTheDocument();
    });

    test('displays experience section with company details', () => {
      renderWithProviders(<ProfilePage />);

      const experience = mockProfile.experience[0];
      const experienceSection = screen.getByRole('region', { name: /experience/i });

      expect(within(experienceSection).getByText(experience.title)).toBeInTheDocument();
      expect(within(experienceSection).getByText(experience.companyName)).toBeInTheDocument();
      expect(within(experienceSection).getByText(/2020 - Present/)).toBeInTheDocument();
    });

    test('displays education section with degree information', () => {
      renderWithProviders(<ProfilePage />);

      const education = mockProfile.education[0];
      const educationSection = screen.getByRole('region', { name: /education/i });

      expect(within(educationSection).getByText(education.degree)).toBeInTheDocument();
      expect(within(educationSection).getByText(education.institution)).toBeInTheDocument();
    });

    test('displays certifications with validity dates', () => {
      renderWithProviders(<ProfilePage />);

      const certification = mockProfile.certifications[0];
      const certSection = screen.getByRole('region', { name: /certifications/i });

      expect(within(certSection).getByText(certification.name)).toBeInTheDocument();
      expect(within(certSection).getByText(certification.issuingOrganization)).toBeInTheDocument();
    });
  });

  describe('Analysis Functionality', () => {
    test('displays match score prominently', () => {
      renderWithProviders(<ProfilePage />);

      const matchScore = screen.getByText(/92%/);
      expect(matchScore).toBeInTheDocument();
      expect(matchScore).toHaveStyle({ fontWeight: 'bold' });
    });

    test('shows analysis loading state during refresh', async () => {
      (useProfile as jest.Mock).mockReturnValue({
        ...mockProfile,
        loading: { fetch: false, analysis: true },
        analysisProgress: 50
      });

      renderWithProviders(<ProfilePage />);

      const progressIndicator = screen.getByRole('progressbar');
      expect(progressIndicator).toBeInTheDocument();
      expect(progressIndicator).toHaveAttribute('aria-valuenow', '50');
    });

    test('handles analysis refresh button click', async () => {
      const mockTriggerAnalysis = vi.fn();
      (useProfile as jest.Mock).mockReturnValue({
        ...mockProfile,
        operations: { triggerAnalysis: mockTriggerAnalysis }
      });

      renderWithProviders(<ProfilePage />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      expect(mockTriggerAnalysis).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    test('subscribes to WebSocket updates on mount', () => {
      const mockSubscribe = vi.fn();
      (useWebSocket as jest.Mock).mockReturnValue({
        isConnected: true,
        subscribe: mockSubscribe
      });

      renderWithProviders(<ProfilePage />);

      expect(mockSubscribe).toHaveBeenCalledWith(
        'analysis.complete',
        expect.any(Function)
      );
    });

    test('updates profile data when WebSocket message received', async () => {
      const mockSubscribe = vi.fn();
      (useWebSocket as jest.Mock).mockReturnValue({
        isConnected: true,
        subscribe: mockSubscribe
      });

      renderWithProviders(<ProfilePage />);

      // Simulate WebSocket message
      const [, handler] = mockSubscribe.mock.calls[0];
      handler({
        type: 'analysis.complete',
        payload: {
          profileId: 'test-id',
          matchScore: 95
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/95%/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when profile fetch fails', () => {
      (useProfile as jest.Mock).mockReturnValue({
        profile: null,
        loading: { fetch: false, analysis: false },
        error: new Error('Failed to fetch profile')
      });

      renderWithProviders(<ProfilePage />);

      expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch profile');
    });

    test('shows retry button when analysis fails', () => {
      (useProfile as jest.Mock).mockReturnValue({
        ...mockProfile,
        error: new Error('Analysis failed'),
        operations: { triggerAnalysis: vi.fn() }
      });

      renderWithProviders(<ProfilePage />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has no accessibility violations', async () => {
      const { container } = renderWithProviders(<ProfilePage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('uses correct ARIA landmarks', () => {
      renderWithProviders(<ProfilePage />);

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getAllByRole('region')).toHaveLength(3); // Experience, Education, Certifications
    });

    test('maintains focus management during analysis', async () => {
      renderWithProviders(<ProfilePage />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      expect(refreshButton).toHaveAttribute('aria-busy', 'true');
      expect(refreshButton).toHaveFocus();
    });
  });

  describe('Loading States', () => {
    test('shows skeleton loader during initial fetch', () => {
      (useProfile as jest.Mock).mockReturnValue({
        profile: null,
        loading: { fetch: true, analysis: false }
      });

      renderWithProviders(<ProfilePage />);

      expect(screen.getAllByTestId('skeleton-loader')).toHaveLength(3);
    });

    test('displays loading indicator during analysis', () => {
      (useProfile as jest.Mock).mockReturnValue({
        ...mockProfile,
        loading: { fetch: false, analysis: true },
        analysisProgress: 75
      });

      renderWithProviders(<ProfilePage />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
    });
  });
});