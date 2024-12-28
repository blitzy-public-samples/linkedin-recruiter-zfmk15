import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@axe-core/react';
import { renderWithProviders } from '../../../tests/utils/test-utils';
import ProfileAnalysis from './ProfileAnalysis';
import WebSocket from 'ws';

// Mock WebSocket
jest.mock('ws');

// Mock profile ID for testing
const mockProfileId = 'test-profile-123';

// Mock analysis data
const mockAnalysisData = {
  skillAnalysis: [
    {
      skillName: 'Python',
      proficiencyScore: 90,
      yearsOfExperience: 5,
      lastUsed: '2023-01-01'
    },
    {
      skillName: 'React',
      proficiencyScore: 85,
      yearsOfExperience: 3,
      lastUsed: '2023-06-01'
    }
  ],
  experienceAnalysis: [
    {
      roleRelevanceScore: 95,
      industryMatchScore: 90,
      projectImpactScore: 88,
      keyAchievements: [
        'Led team of 5 developers',
        'Improved system performance by 40%'
      ]
    }
  ],
  overallMatchScore: 92
};

describe('ProfileAnalysis', () => {
  let mockWebSocket: jest.Mocked<WebSocket>;
  const mockOnAnalysisComplete = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockWebSocket = new WebSocket('ws://localhost') as jest.Mocked<WebSocket>;
    mockOnAnalysisComplete.mockReset();
  });

  afterEach(() => {
    mockWebSocket.close();
  });

  it('renders analysis visualization correctly', async () => {
    const { container } = renderWithProviders(
      <ProfileAnalysis 
        profileId={mockProfileId}
        onAnalysisComplete={mockOnAnalysisComplete}
      />
    );

    // Wait for analysis data to load
    await waitFor(() => {
      expect(screen.getByText('Profile Analysis Results')).toBeInTheDocument();
    });

    // Verify skill analysis section
    const skillSection = screen.getByText('Skill Analysis').parentElement;
    expect(skillSection).toBeInTheDocument();
    expect(within(skillSection!).getByText('Python')).toBeInTheDocument();
    expect(within(skillSection!).getByText('5 years experience')).toBeInTheDocument();

    // Verify experience analysis section
    const experienceSection = screen.getByText('Experience Analysis').parentElement;
    expect(experienceSection).toBeInTheDocument();
    expect(within(experienceSection!).getByText('Role Match: 95%')).toBeInTheDocument();
    expect(within(experienceSection!).getByText('Industry Match: 90%')).toBeInTheDocument();

    // Verify charts are rendered
    expect(container.querySelector('.recharts-radar')).toBeInTheDocument();
    expect(container.querySelector('.recharts-bar-chart')).toBeInTheDocument();
  });

  it('handles real-time updates via WebSocket', async () => {
    renderWithProviders(
      <ProfileAnalysis 
        profileId={mockProfileId}
        onAnalysisComplete={mockOnAnalysisComplete}
      />
    );

    // Simulate WebSocket message with updated analysis
    const updatedAnalysis = {
      ...mockAnalysisData,
      overallMatchScore: 95
    };

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: 'analysis.update',
        profileId: mockProfileId,
        data: updatedAnalysis
      })
    } as WebSocket.MessageEvent);

    // Verify UI updates with new data
    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument();
    });
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithProviders(
      <ProfileAnalysis 
        profileId={mockProfileId}
        onAnalysisComplete={mockOnAnalysisComplete}
      />
    );

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify keyboard navigation
    const user = userEvent.setup();
    const startAnalysisButton = screen.getByRole('button', { name: /start analysis/i });
    
    await user.tab();
    expect(startAnalysisButton).toHaveFocus();

    // Verify ARIA attributes
    expect(screen.getByRole('img', { name: /skill proficiency radar chart/i }))
      .toHaveAttribute('aria-label');
    
    expect(screen.getByRole('img', { name: /role relevance bar chart/i }))
      .toHaveAttribute('aria-label');
  });

  it('handles loading state correctly', async () => {
    renderWithProviders(
      <ProfileAnalysis 
        profileId={mockProfileId}
        onAnalysisComplete={mockOnAnalysisComplete}
      />
    );

    // Verify loading indicator
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Analyzing profile...')).toBeInTheDocument();

    // Wait for analysis completion
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('handles error state and retry functionality', async () => {
    const mockError = new Error('Analysis failed');
    jest.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(
      <ProfileAnalysis 
        profileId={mockProfileId}
        onAnalysisComplete={mockOnAnalysisComplete}
      />
    );

    // Simulate error
    mockWebSocket.onerror?.(new Error('WebSocket error') as WebSocket.ErrorEvent);

    // Verify error display
    await waitFor(() => {
      expect(screen.getByText('Analysis Failed')).toBeInTheDocument();
    });

    // Test retry functionality
    const retryButton = screen.getByRole('button', { name: /retry analysis/i });
    await userEvent.click(retryButton);

    // Verify new analysis is triggered
    expect(mockWebSocket.send).toHaveBeenCalled();
  });
});