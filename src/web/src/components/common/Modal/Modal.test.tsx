import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Theme } from '@mui/material';
import Modal from './Modal';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// Version comments for dependencies
// @testing-library/react version 14.0+
// @testing-library/user-event version 14.0+
// jest-axe version 7.0+
// @mui/material version 5.14+

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

describe('Modal Component', () => {
  // Common props for testing
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
    testId: 'test-modal'
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Material Design Compliance', () => {
    it('should use correct elevation values', () => {
      const { container } = renderWithProviders(
        <Modal {...defaultProps} />
      );
      
      const modalContent = container.querySelector('.MuiModal-root > div');
      expect(modalContent).toHaveStyle({
        boxShadow: expect.stringContaining('0px') // MUI elevation shadow
      });
    });

    it('should implement proper spacing according to Material Design', () => {
      const { container } = renderWithProviders(
        <Modal {...defaultProps} />
      );

      const modalContent = container.querySelector('.MuiModal-root > div');
      expect(modalContent).toHaveStyle({
        padding: expect.stringMatching(/[0-9]+px/)
      });
    });

    it('should follow typography scale', () => {
      renderWithProviders(<Modal {...defaultProps} />);
      
      const title = screen.getByText('Test Modal');
      expect(title).toHaveClass('MuiTypography-h6');
    });

    it('should handle transitions correctly', async () => {
      const { rerender } = renderWithProviders(
        <Modal {...defaultProps} open={false} />
      );

      rerender(<Modal {...defaultProps} open={true} />);
      
      await waitFor(() => {
        const modal = screen.getByTestId('test-modal');
        expect(modal).toHaveClass('MuiModal-root');
      });
    });

    it('should be responsive at different breakpoints', () => {
      const { container } = renderWithProviders(
        <Modal {...defaultProps} size="medium" />
      );

      const modalContent = container.querySelector('.size-medium');
      expect(modalContent).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <Modal {...defaultProps} />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have correct ARIA attributes', () => {
      renderWithProviders(<Modal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'test-modal-title');
    });

    it('should manage focus correctly', async () => {
      renderWithProviders(<Modal {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close modal');
      expect(document.activeElement).toBe(closeButton);
    });

    it('should trap focus within modal', async () => {
      renderWithProviders(<Modal {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Close modal');
      const lastFocusableElement = screen.getByText('Modal content');

      userEvent.tab();
      expect(document.activeElement).toBe(lastFocusableElement);

      userEvent.tab();
      expect(document.activeElement).toBe(closeButton);
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(<Modal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      fireEvent.keyDown(modal, { key: 'Escape' });
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Redux Integration', () => {
    it('should dispatch close action when clicking outside', async () => {
      const { container } = renderWithProviders(
        <Modal {...defaultProps} />
      );
      
      const backdrop = container.querySelector('.MuiBackdrop-root');
      fireEvent.click(backdrop!);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should handle modal state transitions', async () => {
      const onAnimationComplete = jest.fn();
      
      renderWithProviders(
        <Modal 
          {...defaultProps} 
          onAnimationComplete={onAnimationComplete}
        />
      );

      await waitFor(() => {
        expect(onAnimationComplete).toHaveBeenCalled();
      });
    });

    it('should maintain modal stack order', () => {
      const { rerender } = renderWithProviders(
        <Modal {...defaultProps} />
      );

      const secondModal = {
        ...defaultProps,
        title: 'Second Modal',
        testId: 'second-modal'
      };

      rerender(
        <>
          <Modal {...defaultProps} />
          <Modal {...secondModal} />
        </>
      );

      const modals = screen.getAllByRole('dialog');
      expect(modals).toHaveLength(2);
      expect(modals[1]).toHaveTextContent('Second Modal');
    });
  });

  describe('Edge Cases', () => {
    it('should handle long content with scrolling', () => {
      const longContent = Array(50).fill('Content line').join('\n');
      
      const { container } = renderWithProviders(
        <Modal {...defaultProps}>
          {longContent}
        </Modal>
      );

      const modalContent = container.querySelector('.MuiModal-root > div');
      expect(modalContent).toHaveStyle({
        maxHeight: '90vh',
        overflowY: 'auto'
      });
    });

    it('should handle rapid open/close transitions', async () => {
      const { rerender } = renderWithProviders(
        <Modal {...defaultProps} open={false} />
      );

      // Rapid transitions
      rerender(<Modal {...defaultProps} open={true} />);
      rerender(<Modal {...defaultProps} open={false} />);
      rerender(<Modal {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should cleanup properly on unmount', () => {
      const { unmount } = renderWithProviders(
        <Modal {...defaultProps} />
      );

      unmount();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});