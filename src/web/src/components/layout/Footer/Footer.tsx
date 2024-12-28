import React from 'react';
import { Box, Typography, Container, Link, Select, MenuItem, useTheme, SelectChangeEvent } from '@mui/material'; // v5.14+
import { useTranslation } from '../../../config/i18n.config';
import { LANGUAGES } from '../../../config/i18n.config';

// Footer component that provides consistent layout footer across all pages
const Footer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  // Handle language change with proper state updates
  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLang = event.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = ['ar', 'he'].includes(newLang) ? 'rtl' : 'ltr';
  };

  // Get current year for copyright
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
        mt: 'auto', // Push footer to bottom
        py: 3, // Vertical padding
        boxShadow: theme.shadows[1],
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: theme.spacing(2),
          }}
        >
          {/* Copyright Section */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ order: { xs: 2, sm: 1 } }}
          >
            © {currentYear} LinkedIn Profile Search. {t('common.labels.allRightsReserved')}
          </Typography>

          {/* Navigation Links */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: theme.spacing(2),
              order: { xs: 1, sm: 2 },
            }}
          >
            <Link
              href="/privacy"
              color="text.secondary"
              underline="hover"
              sx={{ '&:hover': { color: theme.palette.primary.main } }}
              aria-label={t('common.navigation.privacy')}
            >
              {t('common.navigation.privacy')}
            </Link>
            <Link
              href="/terms"
              color="text.secondary"
              underline="hover"
              sx={{ '&:hover': { color: theme.palette.primary.main } }}
              aria-label={t('common.navigation.terms')}
            >
              {t('common.navigation.terms')}
            </Link>
            <Link
              href="/contact"
              color="text.secondary"
              underline="hover"
              sx={{ '&:hover': { color: theme.palette.primary.main } }}
              aria-label={t('common.navigation.contact')}
            >
              {t('common.navigation.contact')}
            </Link>
          </Box>

          {/* Language Selection */}
          <Box sx={{ order: { xs: 3, sm: 3 } }}>
            <Select
              value={i18n.language}
              onChange={handleLanguageChange}
              variant="outlined"
              size="small"
              sx={{
                minWidth: 120,
                '& .MuiSelect-select': {
                  py: 1,
                  pl: 1.5,
                },
              }}
              aria-label={t('common.accessibility.languageSelection')}
            >
              {LANGUAGES.map((lang) => (
                <MenuItem key={lang} value={lang}>
                  {t(`common.languages.${lang}`)}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;