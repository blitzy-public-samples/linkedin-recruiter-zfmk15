/**
 * @file SearchTemplates.test.tsx
 * @version 1.0.0
 * @description Comprehensive test suite for SearchTemplates component
 * Testing requirements from sections 1.3 and 6.4 of technical specifications
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';

import SearchTemplates from './SearchTemplates';
import { searchService } from '../../../services/search.service';
import { SearchTemplate, SearchCriteria } from '../../../types/search.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock search service
vi.mock('../../../services/search.service', () => ({
  searchService: {
    getSearchTemplates: vi.fn(),
    saveSearchTemplate: vi.fn(),
    deleteSearchTemplate: vi.fn(),
    subscribeToTemplateUpdates: vi.fn(),
  }
}));

// Test data
const mockTemplates: SearchTemplate[] = [
  {
    id: 'template-1',
    name: 'Senior Developer Search',
    criteria: {
      keywords: 'Senior Software Engineer',
      location: 'San Francisco',
      experienceYears: { min: 5, max: 10 },
      requiredSkills: ['React', 'TypeScript', 'AWS'],
      optionalSkills: ['Node.js', 'Python']
    },
    createdBy: 'user-1',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    isActive: true
  },
  {
    id: 'template-2',
    name: 'Tech Lead Search',
    criteria: {
      keywords: 'Technical Lead',
      location: 'Remote',
      experienceYears: { min: 8, max: 15 },
      requiredSkills: ['Architecture', 'Team Leadership', 'Cloud'],
      optionalSkills: ['Agile', 'DevOps']
    },
    createdBy: 'user-1',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
    isActive: true
  }
];

const mockCurrentCriteria: SearchCriteria = {
  keywords: 'Frontend Developer',
  location: 'New York',
  experienceYears: { min: 3, max: 8 },
  requiredSkills: ['React', 'JavaScript'],
  optionalSkills: ['TypeScript']
};

describe('SearchTemplates', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Setup default mocks
    (searchService.getSearchTemplates as jest.Mock).mockResolvedValue(mockTemplates);
    (searchService.saveSearchTemplate as jest.Mock).mockImplementation(
      (template) => Promise.resolve({ ...template, id: 'new-template-id' })
    );
    (searchService.deleteSearchTemplate as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Template List Rendering', () => {
    it('should render loading skeleton while fetching templates', () => {
      render(
        <SearchTemplates 
          onTemplateSelect={vi.fn()} 
          currentCriteria={mockCurrentCriteria}
        />
      );
      
      expect(screen.getByText('Search Templates')).toBeInTheDocument();
      expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
    });

    it('should render template list after loading', async () => {
      render(
        <SearchTemplates 
          onTemplateSelect={vi.fn()} 
          currentCriteria={mockCurrentCriteria}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Senior Developer Search')).toBeInTheDocument();
        expect(screen.getByText('Tech Lead Search')).toBeInTheDocument();
      });
    });

    it('should handle empty template list', async () => {
      (searchService.getSearchTemplates as jest.Mock).mockResolvedValue([]);
      
      render(
        <SearchTemplates 
          onTemplateSelect={vi.fn()} 
          currentCriteria={mockCurrentCriteria}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No templates found')).toBeInTheDocument();
      });
    });
  });

  describe('Template Creation', () => {
    it('should open create template dialog when clicking Save Current button', async () => {
      render(
        <SearchTemplates 
          onTemplateSelect={vi.fn()} 
          currentCriteria={mockCurrentCriteria}
        />
      );

      await user.click(screen.getByText('Save Current'));
      
      expect(screen.getByText('Save Search Template')).toBeInTheDocument();
      expect(screen.getByLabelText('Template Name')).toBeInTheDocument();
    });

    it('should validate template name input', async () => {
      render(
        <SearchTemplates 
          onTemplateSelect={vi.fn()} 
          currentCriteria={mockCurrentCriteria}
        />
      );

      await user.click(screen.getByText('Save Current'));
      const saveButton = screen.getByText('Save');
      
      expect(saveButton).toBeDisabled();

      await user.type(screen.getByLabelText('Template Name'), 'New Template');
      expect(saveButton).toBeEnabled();
    });

    it('should create new template successfully', async () => {
      const onTemplateSelect = vi.fn();
      
      render(
        <SearchTemplates 
          onTemplateSelect={onTemplateSelect} 
          currentCriteria={mockCurrentCriteria}
        />
      );

      await user.click(screen.getByText('Save Current'));
      await user.type(screen.getByLabelText('Template Name'), 'New Template');
      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(searchService.saveSearchTemplate).toHaveBeenCalledWith({
          name: 'New Template',
          criteria: mockCurrentCriteria
        });
      });

      expect(onTemplateSelect).toHaveBeenCalled();
    });
  });

  describe('Template Operations', () => {
    it('should apply template when clicking apply button', async () => {
      const onTemplateSelect = vi.fn();
      
      render(
        <SearchTemplates 
          onTemplateSelect={onTemplateSelect} 
          currentCriteria={mockCurrentCriteria}
        />
      );

      await waitFor(() => {
        const applyButtons = screen.getAllByLabelText('Apply template');
        fireEvent.click(applyButtons[0]);
      });

      expect(onTemplateSelect).toHaveBeenCalledWith(mockTemplates[0]);
    });

    it('should delete template with confirmation', async () => {
      render(
        <SearchTemplates 
          onTemplateSelect={vi.fn()} 
          currentCriteria={mockCurrentCriteria}
        />
      );

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText('Delete template');
        fireEvent.click(deleteButtons[0]);
      });

      // Confirm deletion
      await user.click(screen.getByText('Confirm'));

      expect(searchService.deleteSearchTemplate).toHaveBeenCalledWith('template-1');
    });
  });

  describe('Real-time Updates', () => {
    it('should handle template updates from WebSocket', async () => {
      const mockWebSocketUpdate = {
        id: 'template-3',
        name: 'New Template from WS',
        criteria: mockCurrentCriteria,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };

      render(
        <SearchTemplates 
          onTemplateSelect={vi.fn()} 
          currentCriteria={mockCurrentCriteria}
        />
      );

      // Simulate WebSocket update
      const updateCallback = (searchService.subscribeToTemplateUpdates as jest.Mock).mock.calls[0][1];
      updateCallback(mockWebSocketUpdate);

      await waitFor(() => {
        expect(screen.getByText('New Template from WS')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <SearchTemplates 
          onTemplateSelect={vi.fn()} 
          currentCriteria={mockCurrentCriteria}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      render(
        <SearchTemplates 
          onTemplateSelect={vi.fn()} 
          currentCriteria={mockCurrentCriteria}
        />
      );

      await user.tab();
      expect(screen.getByText('Save Current')).toHaveFocus();

      await user.tab();
      const firstTemplate = await screen.findByText('Senior Developer Search');
      expect(within(firstTemplate.parentElement!).getByLabelText('Apply template')).toHaveFocus();
    });

    it('should have proper ARIA labels', async () => {
      render(
        <SearchTemplates 
          onTemplateSelect={vi.fn()} 
          currentCriteria={mockCurrentCriteria}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Template Name')).toBeInTheDocument();
        expect(screen.getAllByLabelText('Apply template')).toHaveLength(2);
        expect(screen.getAllByLabelText('Delete template')).toHaveLength(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      (searchService.getSearchTemplates as jest.Mock).mockRejectedValue(error);
      const onError = vi.fn();

      render(
        <SearchTemplates 
          onTemplateSelect={vi.fn()} 
          currentCriteria={mockCurrentCriteria}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it('should show error state for failed operations', async () => {
      (searchService.deleteSearchTemplate as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      render(
        <SearchTemplates 
          onTemplateSelect={vi.fn()} 
          currentCriteria={mockCurrentCriteria}
        />
      );

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText('Delete template');
        fireEvent.click(deleteButtons[0]);
      });

      expect(await screen.findByText('Operation failed')).toBeInTheDocument();
    });
  });
});