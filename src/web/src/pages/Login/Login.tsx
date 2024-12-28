/**
 * @file Enhanced Login Page Component
 * @version 1.0.0
 * @description Implements secure login functionality with Material Design 3.0,
 * comprehensive security monitoring, and WCAG 2.1 AA compliance
 */

import React, { useCallback, useEffect, useState } from 'react'; // v18.2+
import { useNavigate } from 'react-router-dom'; // v6.0+
import { useForm } from 'react-hook-form'; // v7.0+
import * as yup from 'yup'; // v1.0+
import { styled } from '@mui/material/styles'; // v5.14+
import { Typography, Paper, Box, Alert } from '@mui/material'; // v5.14+
import { LoginRequest } from '../../types/auth.types';
import { Button } from '../../components/common/Button/Button';
import { Input } from '../../components/common/Input/Input';
import { useAuth } from '../../hooks/useAuth';
import { logError, ErrorSeverity } from '../../utils/errorHandling';

// Validation schema with enhanced security rules
const loginSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must not exceed 255 characters'),
  password: yup
    .string()
    .required('Password is required')
    .min(12, 'Password must be at least 12 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
});

// Enhanced styled components with accessibility features
const LoginContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
}));

const LoginForm = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(4),
  maxWidth: '400px',
  width: '100%',
  gap: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[3],
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(3),
  },
  '&:focus-within': {
    outline: `3px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
}));

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [securityError, setSecurityError] = useState<string>('');
  const [attemptCount, setAttemptCount] = useState(0);

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset
  } = useForm<LoginRequest>({
    mode: 'onBlur',
    resolver: async (data) => {
      try {
        await loginSchema.validate(data, { abortEarly: false });
        return { values: data, errors: {} };
      } catch (err) {
        if (err instanceof yup.ValidationError) {
          const errors = err.inner.reduce((acc, error) => {
            if (error.path) {
              acc[error.path] = error.message;
            }
            return acc;
          }, {} as Record<string, string>);
          return { values: {}, errors };
        }
        return { values: {}, errors: {} };
      }
    }
  });

  // Reset security error on unmount
  useEffect(() => {
    return () => {
      setSecurityError('');
      setAttemptCount(0);
    };
  }, []);

  // Enhanced secure form submission handler
  const onSubmit = useCallback(async (data: LoginRequest) => {
    try {
      // Track login attempts
      setAttemptCount((prev) => prev + 1);

      // Log login attempt for security monitoring
      logError(
        new Error('Login attempt initiated'),
        'Login Page',
        {
          securityContext: {
            email: data.email,
            attemptCount,
            timestamp: new Date().toISOString()
          }
        }
      );

      await login(data);
      
      // Reset form and security state on success
      reset();
      setSecurityError('');
      setAttemptCount(0);
      
      // Navigate to dashboard
      navigate('/dashboard');

    } catch (error) {
      // Enhanced error handling with security monitoring
      const message = error instanceof Error ? error.message : 'Login failed';
      
      setSecurityError(message);

      logError(error as Error, 'Login Failed', {
        severity: ErrorSeverity.HIGH,
        securityContext: {
          email: data.email,
          attemptCount,
          timestamp: new Date().toISOString()
        }
      });

      // Implement exponential backoff for repeated failures
      if (attemptCount >= 3) {
        const waitTime = Math.pow(2, attemptCount - 3) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }, [login, navigate, reset, attemptCount]);

  return (
    <LoginContainer>
      <LoginForm
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        role="form"
        aria-label="Login form"
      >
        <Typography
          variant="h4"
          component="h1"
          align="center"
          gutterBottom
          sx={{ mb: 3 }}
        >
          Sign In
        </Typography>

        {(error || securityError) && (
          <Alert 
            severity="error"
            sx={{ mb: 2 }}
            role="alert"
          >
            {securityError || error?.message}
          </Alert>
        )}

        <Input
          id="email"
          name="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          error={!!errors.email}
          helperText={errors.email?.message}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          disabled={loading}
        />

        <Input
          id="password"
          name="password"
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          error={!!errors.password}
          helperText={errors.password?.message}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          disabled={loading}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          loading={loading}
          disabled={loading || attemptCount >= 5}
          loadingText="Signing in..."
          aria-label="Sign in"
        >
          Sign In
        </Button>
      </LoginForm>
    </LoginContainer>
  );
};

export default Login;