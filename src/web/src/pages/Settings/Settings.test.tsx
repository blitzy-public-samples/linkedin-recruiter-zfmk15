import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { axe } from '@axe-core/react';
import Settings from './Settings';
import { renderWithProviders } from '../../tests/utils/test-utils';

// Mock Redux hooks
vi.mock('react-redux', () => ({
  ...vi.importActual('react-redux'),
  useDispatch: () => vi.fn(),
  useSelector: vi.fn()
}));

// Mock i18n hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en'
    }
  })
}));

// Mock API calls
vi.mock('../../services/api.service', () => ({
  updateSettings: vi.fn()
}));

// Initial test state
const mockInitialState = {
  auth: {
    user: {
      id: 'test-user-id',
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: false
        }
      }
    }
  },
  ui: {
    theme: 'light',
    language: 'en'
  }
};

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('renders settings form correctly', async () => {
    const { container } = renderWithProviders(<Settings />, {
      preloadedState: mockInitialState
    });

    // Verify form sections are present
    expect(screen.getByText('common.navigation.settings')).toBeInTheDocument();
    expect(screen.getByText('settings.appearance.theme')).toBeInTheDocument();
    expect(screen.getByText('settings.appearance.language')).toBeInTheDocument();
    expect(screen.getByText('settings.notifications.title')).toBeInTheDocument();
    expect(screen.getByText('settings.regional.title')).toBeInTheDocument();

    // Verify initial form values
    expect(screen.getByRole('combobox', { name: /theme/i })).toHaveValue('light');
    expect(screen.getByRole('combobox', { name: /language/i })).toHaveValue('en');

    // Verify accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('theme switching functionality', async () => {
    const { store } = renderWithProviders(<Settings />, {
      preloadedState: mockInitialState
    });

    const themeSelect = screen.getByRole('combobox', { 
      name: 'settings.accessibility.themeSelection' 
    });

    // Change theme to dark
    await userEvent.selectOptions(themeSelect, 'dark');

    // Verify theme change in Redux store
    await waitFor(() => {
      expect(store.getState().ui.theme).toBe('dark');
    });

    // Verify system preference detection
    await userEvent.selectOptions(themeSelect, 'system');
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.matches = true;
    mediaQuery.dispatchEvent(new Event('change'));

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  test('language switching behavior', async () => {
    const { store } = renderWithProviders(<Settings />, {
      preloadedState: mockInitialState
    });

    const languageSelect = screen.getByRole('combobox', {
      name: 'settings.accessibility.languageSelection'
    });

    // Change language to Spanish
    await userEvent.selectOptions(languageSelect, 'es');

    // Verify language change effects
    await waitFor(() => {
      expect(document.documentElement.lang).toBe('es');
      expect(store.getState().ui.language).toBe('es');
    });

    // Test RTL support
    await userEvent.selectOptions(languageSelect, 'ar');
    await waitFor(() => {
      expect(document.documentElement.dir).toBe('rtl');
    });
  });

  test('form validation and submission', async () => {
    const { store } = renderWithProviders(<Settings />, {
      preloadedState: mockInitialState
    });

    // Get form elements
    const saveButton = screen.getByRole('button', { 
      name: 'settings.accessibility.saveSettings' 
    });

    // Submit form with valid data
    await userEvent.click(saveButton);

    // Verify loading state
    expect(saveButton).toBeDisabled();
    expect(screen.getByText('common.labels.saving')).toBeInTheDocument();

    // Verify success notification
    await waitFor(() => {
      expect(screen.getByText('common.labels.success')).toBeInTheDocument();
    });

    // Test error handling
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(store.dispatch).mockRejectedValueOnce(new Error('API Error'));

    await userEvent.click(saveButton);
    await waitFor(() => {
      expect(screen.getByText('common.errors.serverError')).toBeInTheDocument();
    });
  });

  test('accessibility compliance', async () => {
    const { container } = renderWithProviders(<Settings />, {
      preloadedState: mockInitialState
    });

    // Test keyboard navigation
    const firstInput = screen.getByRole('combobox', { 
      name: 'settings.accessibility.themeSelection' 
    });
    firstInput.focus();
    expect(document.activeElement).toBe(firstInput);

    // Test ARIA attributes
    const form = container.querySelector('form');
    expect(form).toHaveAttribute('aria-label', 'settings.accessibility.settingsForm');

    const switches = screen.getAllByRole('switch');
    switches.forEach(switchEl => {
      expect(switchEl).toHaveAttribute('aria-checked');
    });

    // Test screen reader announcements
    const saveButton = screen.getByRole('button', {
      name: 'settings.accessibility.saveSettings'
    });
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'polite');
    });

    // Verify no accessibility violations
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('reset settings confirmation', async () => {
    renderWithProviders(<Settings />, {
      preloadedState: mockInitialState
    });

    // Click reset button
    const resetButton = screen.getByRole('button', {
      name: 'settings.accessibility.resetSettings'
    });
    await userEvent.click(resetButton);

    // Verify confirmation dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('settings.confirmReset.title')).toBeInTheDocument();

    // Confirm reset
    const confirmButton = within(dialog).getByRole('button', {
      name: 'common.buttons.reset'
    });
    await userEvent.click(confirmButton);

    // Verify settings reset to defaults
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /theme/i })).toHaveValue('system');
      expect(screen.getByRole('combobox', { name: /language/i })).toHaveValue('en');
    });
  });
});