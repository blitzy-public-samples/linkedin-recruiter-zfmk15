import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@axe-core/react'; // v4.7+
import { Footer } from './Footer';
import { renderWithProviders } from '../../../tests/utils/test-utils';

// Test IDs for consistent querying
const TEST_IDS = {
  FOOTER: 'footer-component',
  LANG_SELECT: 'language-selector',
  COPYRIGHT: 'copyright-text',
  NAV_LINKS: 'footer-navigation',
  SOCIAL_LINKS: 'social-media-links'
} as const;

// Mock translations for testing
const MOCK_TRANSLATIONS = {
  en: {
    'common.navigation.privacy': 'Privacy',
    'common.navigation.terms': 'Terms',
    'common.navigation.contact': 'Contact',
    'common.accessibility.languageSelection': 'Select language',
    'common.languages.en': 'English',
    'common.languages.es': 'Spanish',
    'common.languages.fr': 'French',
    'common.labels.allRightsReserved': 'All rights reserved'
  },
  es: {
    'common.navigation.privacy': 'Privacidad',
    'common.navigation.terms': 'Términos',
    'common.navigation.contact': 'Contacto',
    'common.accessibility.languageSelection': 'Seleccionar idioma',
    'common.languages.en': 'Inglés',
    'common.languages.es': 'Español',
    'common.languages.fr': 'Francés',
    'common.labels.allRightsReserved': 'Todos los derechos reservados'
  },
  fr: {
    'common.navigation.privacy': 'Confidentialité',
    'common.navigation.terms': 'Conditions',
    'common.navigation.contact': 'Contact',
    'common.accessibility.languageSelection': 'Sélectionner la langue',
    'common.languages.en': 'Anglais',
    'common.languages.es': 'Espagnol',
    'common.languages.fr': 'Français',
    'common.labels.allRightsReserved': 'Tous droits réservés'
  }
};

describe('Footer', () => {
  // Setup before each test
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset i18n language
    localStorage.setItem('i18nextLng', 'en');
  });

  // Cleanup after each test
  afterEach(() => {
    localStorage.clear();
  });

  it('renders correctly with Material Design styling', async () => {
    const { container } = renderWithProviders(<Footer />);
    
    // Verify footer exists
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    
    // Check Material Design styling
    expect(footer).toHaveStyle({
      backgroundColor: expect.any(String),
      borderTop: expect.stringContaining('solid'),
      boxShadow: expect.any(String)
    });
    
    // Verify consistent spacing
    const content = within(footer).getByRole('contentinfo');
    expect(content).toHaveStyle({
      padding: expect.stringContaining('px')
    });
  });

  it('displays correct copyright text and year', () => {
    renderWithProviders(<Footer />);
    
    const currentYear = new Date().getFullYear();
    const copyright = screen.getByText(new RegExp(`${currentYear}`));
    
    expect(copyright).toBeInTheDocument();
    expect(copyright).toHaveTextContent(`© ${currentYear} LinkedIn Profile Search`);
  });

  it('renders all navigation links correctly', () => {
    renderWithProviders(<Footer />);
    
    const links = screen.getAllByRole('link');
    const linkTexts = ['Privacy', 'Terms', 'Contact'];
    
    linkTexts.forEach(text => {
      const link = screen.getByText(text);
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', expect.stringContaining('/'));
    });
  });

  it('handles language changes correctly', async () => {
    renderWithProviders(<Footer />);
    
    // Get language selector
    const langSelect = screen.getByLabelText(/Select language/i);
    expect(langSelect).toBeInTheDocument();

    // Change language to Spanish
    await userEvent.click(langSelect);
    const spanishOption = screen.getByText('Spanish');
    await userEvent.click(spanishOption);

    // Verify Spanish translations
    await waitFor(() => {
      expect(screen.getByText('Privacidad')).toBeInTheDocument();
      expect(screen.getByText('Términos')).toBeInTheDocument();
      expect(screen.getByText('Contacto')).toBeInTheDocument();
    });

    // Verify language persistence
    expect(localStorage.getItem('i18nextLng')).toBe('es');
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithProviders(<Footer />);
    
    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    
    // Check ARIA labels
    const langSelect = screen.getByLabelText(/Select language/i);
    expect(langSelect).toHaveAttribute('aria-label');
    
    // Verify keyboard navigation
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveAttribute('aria-label');
    });
    
    // Test focus management
    await userEvent.tab();
    expect(links[0]).toHaveFocus();
  });

  it('supports keyboard navigation', async () => {
    renderWithProviders(<Footer />);
    
    // Tab through all interactive elements
    const interactiveElements = screen.getAllByRole('link')
      .concat(screen.getByRole('combobox'));
    
    for (const element of interactiveElements) {
      await userEvent.tab();
      expect(element).toHaveFocus();
    }
  });

  it('maintains visual hierarchy on different screen sizes', async () => {
    const { container } = renderWithProviders(<Footer />);
    
    // Test mobile layout
    window.innerWidth = 375;
    fireEvent(window, new Event('resize'));
    
    expect(container.firstChild).toHaveStyle({
      flexDirection: expect.stringContaining('column')
    });
    
    // Test desktop layout
    window.innerWidth = 1024;
    fireEvent(window, new Event('resize'));
    
    expect(container.firstChild).toHaveStyle({
      flexDirection: expect.stringContaining('row')
    });
  });

  it('persists language selection across sessions', async () => {
    renderWithProviders(<Footer />);
    
    // Change language
    const langSelect = screen.getByLabelText(/Select language/i);
    await userEvent.click(langSelect);
    await userEvent.click(screen.getByText('French'));
    
    // Verify persistence
    expect(localStorage.getItem('i18nextLng')).toBe('fr');
    
    // Remount component
    const { container } = renderWithProviders(<Footer />);
    
    // Verify language maintained
    await waitFor(() => {
      expect(screen.getByText('Confidentialité')).toBeInTheDocument();
    });
  });

  it('handles RTL languages correctly', async () => {
    // Mock RTL language support
    const rtlLanguage = 'ar';
    renderWithProviders(<Footer />);
    
    // Change to RTL language
    const langSelect = screen.getByLabelText(/Select language/i);
    await userEvent.click(langSelect);
    
    // Simulate RTL language selection
    fireEvent.change(langSelect, { target: { value: rtlLanguage } });
    
    // Verify RTL direction
    await waitFor(() => {
      expect(document.documentElement.dir).toBe('rtl');
    });
  });
});