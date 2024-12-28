import { createTheme, ThemeOptions, PaletteMode } from '@mui/material'; // v5.14+

// Material Design 3.0 Light Theme Palette
export const LIGHT_PALETTE = {
  primary: {
    main: '#006494', // Primary brand color
    light: '#4B9CC9',
    dark: '#003E62',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#525252', // Secondary brand color
    light: '#757575',
    dark: '#232323',
    contrastText: '#FFFFFF',
  },
  surface: {
    main: '#FFFFFF',
    variant: '#F5F5F5',
    container: '#FAFAFA',
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)',
  },
  state: {
    success: '#2E7D32',
    error: '#D32F2F',
    warning: '#ED6C02',
    info: '#0288D1',
  },
} as const;

// Material Design 3.0 Dark Theme Palette
export const DARK_PALETTE = {
  primary: {
    main: '#4B9CC9',
    light: '#7FCAFF',
    dark: '#006494',
    contrastText: '#000000',
  },
  secondary: {
    main: '#757575',
    light: '#A4A4A4',
    dark: '#494949',
    contrastText: '#000000',
  },
  surface: {
    main: '#121212',
    variant: '#1E1E1E',
    container: '#2C2C2C',
  },
  text: {
    primary: 'rgba(255, 255, 255, 0.87)',
    secondary: 'rgba(255, 255, 255, 0.6)',
    disabled: 'rgba(255, 255, 255, 0.38)',
  },
  state: {
    success: '#66BB6A',
    error: '#F44336',
    warning: '#FFA726',
    info: '#29B6F6',
  },
} as const;

// Material Design 3.0 Base Theme Configuration
export const themeConfig: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '0em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '0.00735em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '0em',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '0.0075em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      letterSpacing: '0.01071em',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.75,
      letterSpacing: '0.02857em',
      textTransform: 'none',
    },
  },
  spacing: (factor: number) => `${8 * factor}px`,
  breakpoints: {
    values: {
      xs: 320,
      sm: 768,
      md: 1024,
      lg: 1440,
      xl: 1920,
    },
  },
  shape: {
    borderRadius: 8,
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0,0,0,0.14)',
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0px 2px 4px rgba(0,0,0,0.14)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'medium',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          height: '32px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 1px 2px rgba(0,0,0,0.12)',
        },
        elevation2: {
          boxShadow: '0px 2px 4px rgba(0,0,0,0.14)',
        },
        elevation3: {
          boxShadow: '0px 4px 8px rgba(0,0,0,0.16)',
        },
        elevation4: {
          boxShadow: '0px 8px 16px rgba(0,0,0,0.18)',
        },
      },
    },
  },
} as const;

// Theme Creation Function
const createAppTheme = (mode: PaletteMode) => {
  const palette = mode === 'light' ? LIGHT_PALETTE : DARK_PALETTE;

  return createTheme({
    ...themeConfig,
    palette: {
      mode,
      primary: palette.primary,
      secondary: palette.secondary,
      background: {
        default: palette.surface.main,
        paper: palette.surface.variant,
      },
      text: palette.text,
      success: {
        main: palette.state.success,
      },
      error: {
        main: palette.state.error,
      },
      warning: {
        main: palette.state.warning,
      },
      info: {
        main: palette.state.info,
      },
    },
  });
};

export default createAppTheme;