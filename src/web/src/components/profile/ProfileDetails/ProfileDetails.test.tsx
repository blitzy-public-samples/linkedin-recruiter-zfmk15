import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ThemeProvider, useTheme } from '@mui/material';
import createAppTheme from '../../../config/theme.config';
import ProfileDetails from './ProfileDetails';
import { WebSocketService } from '../../../services/websocket.service';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('../../../hooks/useWebSocket', () => ({
  __esModule: true,
  default: () => ({
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    isConnected: true
  })
}));

jest.mock('../../../hooks/useResponsive', () => ({
  __esModule: true,
  default: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true
  })
}));

// Mock theme hook
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useTheme: () => createAppTheme('light')
}));

// Test data
const mockProfile = {
  id: 'test-profile-1',
  fullName: 'John Doe',
  headline: 'Senior Software Engineer',
  location: 'San Francisco, CA',
  imageUrl: 'https://example.com/profile.jpg',
  experience: [
    {
      id: 'exp1',
      companyName: 'Tech Corp',
      title: 'Senior Engineer',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2023-06-30'),
      description: 'Led development team of 5 engineers',
      location: 'San Francisco, CA',
      skills: ['React', 'Node.js', 'AWS'],
      highlights: ['Increased deployment efficiency by 50%']
    }
  ],
  education: [
    {
      id: 'edu1',
      institution: 'University of Technology',
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Computer Science',
      startDate: new Date('2012-09-01'),
      endDate: new Date('2016-06-30'),
      grade: '3.8 GPA',
      activities: ['ACM Club President', 'Hackathon Winner']
    }
  ],
  skills: ['JavaScript', 'React', 'Node.js', 'AWS'],
  lastAnalyzedAt: new Date('2023-07-01'),
  matchScore: 92
};

describe('ProfileDetails Component', () => {
  let mockOnEdit: jest.Mock;
  let mockOnAnalysisUpdate: jest.Mock;

  beforeEach(() => {
    mockOnEdit = jest.fn();
    mockOnAnalysisUpdate = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <ThemeProvider theme={createAppTheme('light')}>
        <ProfileDetails
          profile={mockProfile}
          showAnalysis={true}
          onEdit={mockOnEdit}
          onAnalysisUpdate={mockOnAnalysisUpdate}
        />
      </ThemeProvider>
    );
  };

  describe('Profile Information Display', () => {
    it('should render all profile sections correctly', () => {
      renderComponent();

      // Verify header information
      expect(screen.getByText(mockProfile.fullName)).toBeInTheDocument();
      expect(screen.getByText(mockProfile.headline)).toBeInTheDocument();
      expect(screen.getByText(mockProfile.location)).toBeInTheDocument();

      // Verify experience section
      const experience = mockProfile.experience[0];
      expect(screen.getByText(experience.title)).toBeInTheDocument();
      expect(screen.getByText(experience.companyName)).toBeInTheDocument();
      expect(screen.getByText(/Jan 2020 - Jun 2023/)).toBeInTheDocument();

      // Verify education section
      const education = mockProfile.education[0];
      expect(screen.getByText(education.institution)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(education.degree))).toBeInTheDocument();
    });

    it('should display skills with proper formatting', () => {
      renderComponent();
      
      mockProfile.skills.forEach(skill => {
        const skillChip = screen.getByText(skill);
        expect(skillChip).toBeInTheDocument();
        expect(skillChip.closest('.MuiChip-root')).toHaveStyle({
          borderRadius: '16px',
          height: '32px'
        });
      });
    });

    it('should handle missing optional profile data gracefully', () => {
      const incompleteProfile = {
        ...mockProfile,
        headline: null,
        experience: [{
          ...mockProfile.experience[0],
          description: null,
          endDate: null
        }]
      };

      render(
        <ThemeProvider theme={createAppTheme('light')}>
          <ProfileDetails profile={incompleteProfile} />
        </ThemeProvider>
      );

      // Verify present data
      expect(screen.getByText(incompleteProfile.fullName)).toBeInTheDocument();
      
      // Verify handling of null values
      const experience = screen.getByText(/Present/);
      expect(experience).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to analysis updates on mount', async () => {
      const { unmount } = renderComponent();
      
      await waitFor(() => {
        expect(WebSocketService.getInstance().subscribe).toHaveBeenCalledWith(
          'analysis.complete',
          expect.any(Function)
        );
      });

      unmount();

      await waitFor(() => {
        expect(WebSocketService.getInstance().unsubscribe).toHaveBeenCalled();
      });
    });

    it('should update analysis data when websocket event is received', async () => {
      renderComponent();

      const mockAnalysisUpdate = {
        profileId: mockProfile.id,
        matchScore: 95,
        updatedAt: new Date()
      };

      // Simulate WebSocket message
      await waitFor(() => {
        const subscribeCall = WebSocketService.getInstance().subscribe.mock.calls[0];
        const callback = subscribeCall[1];
        callback(mockAnalysisUpdate);
      });

      expect(mockOnAnalysisUpdate).toHaveBeenCalledWith(mockAnalysisUpdate);
    });
  });

  describe('Accessibility Compliance', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderComponent();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', () => {
      renderComponent();
      
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        element.focus();
        expect(element).toHaveFocus();
      });
    });

    it('should have proper ARIA labels and roles', () => {
      renderComponent();

      // Verify article role for main container
      expect(screen.getByRole('article')).toBeInTheDocument();

      // Verify heading hierarchy
      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveTextContent(mockProfile.fullName);
      expect(headings[0].tagName).toBe('H1');
    });
  });

  describe('Visual Design Standards', () => {
    it('should apply Material Design 3.0 styles', () => {
      renderComponent();

      // Verify typography styles
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveStyle({
        fontSize: '2.5rem',
        fontWeight: 500,
        lineHeight: 1.2
      });

      // Verify elevation and spacing
      const profileCard = screen.getByRole('article');
      expect(profileCard).toHaveStyle({
        marginBottom: '24px'
      });
    });

    it('should be responsive to different screen sizes', () => {
      // Mock mobile viewport
      jest.spyOn(require('../../../hooks/useResponsive'), 'default')
        .mockImplementation(() => ({
          isMobile: true,
          isTablet: false,
          isDesktop: false
        }));

      renderComponent();

      const header = screen.getByRole('article');
      expect(header).toHaveStyle({
        flexDirection: 'column'
      });
    });
  });
});