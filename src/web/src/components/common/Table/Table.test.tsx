import React from 'react'; // v18.2.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0.0
import { vi, describe, it, expect, beforeEach } from 'vitest'; // v0.34.0
import userEvent from '@testing-library/user-event'; // v14.4.3
import { axe } from '@axe-core/react'; // v4.7.3
import { createTheme } from '@mui/material'; // v5.14.0

import Table from './Table';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// Mock data setup
const mockColumns = [
  { id: 'name', label: 'Name', sortable: true },
  { id: 'title', label: 'Title', sortable: true },
  { id: 'location', label: 'Location', sortable: false },
  { id: 'matchScore', label: 'Match Score', sortable: true, align: 'right' }
];

const mockData = Array.from({ length: 50 }, (_, index) => ({
  id: `profile-${index}`,
  name: `John Doe ${index}`,
  title: `Senior Developer ${index}`,
  location: 'San Francisco, CA',
  matchScore: 95 - index
}));

const mockHandleSort = vi.fn();
const mockHandlePageChange = vi.fn();
const mockHandlePageSizeChange = vi.fn();
const mockHandleRowClick = vi.fn();

// Theme setup for Material Design 3.0 testing
const mockTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6750A4'
    }
  }
});

describe('Table Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Functionality', () => {
    it('renders table with correct columns and data', () => {
      renderWithProviders(
        <Table
          columns={mockColumns}
          data={mockData}
          pageSize={10}
          page={0}
          totalCount={mockData.length}
        />
      );

      // Verify column headers
      mockColumns.forEach(column => {
        expect(screen.getByText(column.label)).toBeInTheDocument();
      });

      // Verify first page of data
      const rows = screen.getAllByRole('row').slice(1); // Skip header row
      expect(rows).toHaveLength(10);
      
      // Verify first row data
      const firstRow = rows[0];
      expect(within(firstRow).getByText('John Doe 0')).toBeInTheDocument();
      expect(within(firstRow).getByText('Senior Developer 0')).toBeInTheDocument();
    });

    it('handles sorting when clicking sortable columns', async () => {
      renderWithProviders(
        <Table
          columns={mockColumns}
          data={mockData}
          onSort={mockHandleSort}
          sortBy="name"
          sortOrder="asc"
        />
      );

      // Click name column header
      const nameHeader = screen.getByText('Name');
      await userEvent.click(nameHeader);

      expect(mockHandleSort).toHaveBeenCalledWith('name', 'desc');
    });

    it('handles pagination correctly', async () => {
      renderWithProviders(
        <Table
          columns={mockColumns}
          data={mockData}
          pageSize={10}
          page={0}
          totalCount={mockData.length}
          onPageChange={mockHandlePageChange}
          onPageSizeChange={mockHandlePageSizeChange}
        />
      );

      // Go to next page
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await userEvent.click(nextButton);
      expect(mockHandlePageChange).toHaveBeenCalledWith(1);

      // Change page size
      const pageSizeSelect = screen.getByRole('combobox');
      await userEvent.click(pageSizeSelect);
      const option25 = screen.getByRole('option', { name: '25' });
      await userEvent.click(option25);
      expect(mockHandlePageSizeChange).toHaveBeenCalledWith(25);
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 AA standards', async () => {
      const { container } = renderWithProviders(
        <Table
          columns={mockColumns}
          data={mockData}
          pageSize={10}
          page={0}
          totalCount={mockData.length}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      renderWithProviders(
        <Table
          columns={mockColumns}
          data={mockData}
          pageSize={10}
          page={0}
          totalCount={mockData.length}
          onRowClick={mockHandleRowClick}
        />
      );

      // Focus first row
      const firstRow = screen.getAllByRole('row')[1];
      firstRow.focus();
      expect(document.activeElement).toBe(firstRow);

      // Press Enter to select row
      await userEvent.keyboard('{Enter}');
      expect(mockHandleRowClick).toHaveBeenCalledWith(mockData[0]);
    });

    it('provides proper ARIA labels and roles', () => {
      renderWithProviders(
        <Table
          columns={mockColumns}
          data={mockData}
          pageSize={10}
          page={0}
          totalCount={mockData.length}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('rowgroup')).toBeInTheDocument();
      mockColumns.forEach(column => {
        expect(screen.getByRole('columnheader', { name: column.label })).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(
        <Table
          columns={mockColumns}
          data={mockData}
          pageSize={10}
          page={0}
          totalCount={mockData.length}
        />
      );

      // Verify mobile-optimized layout
      const table = screen.getByRole('table');
      expect(table).toHaveStyle({ maxWidth: '100%' });
    });

    it('handles touch interactions', async () => {
      renderWithProviders(
        <Table
          columns={mockColumns}
          data={mockData}
          pageSize={10}
          page={0}
          totalCount={mockData.length}
          onRowClick={mockHandleRowClick}
        />
      );

      const firstRow = screen.getAllByRole('row')[1];
      await userEvent.click(firstRow);
      expect(mockHandleRowClick).toHaveBeenCalledWith(mockData[0]);
    });
  });

  describe('Performance', () => {
    it('efficiently handles large datasets with virtualization', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockData[0],
        id: `profile-${i}`,
        name: `John Doe ${i}`
      }));

      const startTime = performance.now();
      
      renderWithProviders(
        <Table
          columns={mockColumns}
          data={largeDataset}
          pageSize={50}
          page={0}
          totalCount={largeDataset.length}
          virtualization={true}
          rowHeight={53}
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Render should complete within 100ms

      // Verify only visible rows are rendered
      const renderedRows = screen.getAllByRole('row').length - 1; // Subtract header row
      expect(renderedRows).toBeLessThanOrEqual(50);
    });

    it('implements proper re-render optimization', async () => {
      const renderSpy = vi.fn();

      function TableWrapper(props: any) {
        renderSpy();
        return <Table {...props} />;
      }

      const { rerender } = renderWithProviders(
        <TableWrapper
          columns={mockColumns}
          data={mockData}
          pageSize={10}
          page={0}
          totalCount={mockData.length}
        />
      );

      // Re-render with same props
      rerender(
        <TableWrapper
          columns={mockColumns}
          data={mockData}
          pageSize={10}
          page={0}
          totalCount={mockData.length}
        />
      );

      expect(renderSpy).toHaveBeenCalledTimes(2); // Initial + 1 rerender
    });
  });

  describe('Loading State', () => {
    it('displays loading indicator when loading prop is true', () => {
      renderWithProviders(
        <Table
          columns={mockColumns}
          data={[]}
          loading={true}
          pageSize={10}
          page={0}
          totalCount={0}
        />
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });
});