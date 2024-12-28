/**
 * @fileoverview Enhanced Input component with Material Design 3.0 compliance,
 * comprehensive accessibility features, and robust security validation
 * @version 1.0.0
 */

import React, { useCallback, useState, useRef, useEffect } from 'react'; // ^18.0.0
import { TextField, TextFieldProps } from '@mui/material'; // ^5.14.0
import { styled } from '@mui/material/styles'; // ^5.14.0
import { useDebounce } from 'use-debounce'; // ^9.0.0
import { sanitizeInput } from '../../utils/validation';

/**
 * Enhanced props interface for Input component with comprehensive validation
 * and accessibility features
 */
export interface InputProps extends Omit<TextFieldProps, 'onChange'> {
  id: string;
  name: string;
  label: string;
  value: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  pattern?: string;
  validationMessage?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onError?: (error: string) => void;
}

/**
 * Enhanced styled TextField component following Material Design 3.0 guidelines
 * with comprehensive accessibility features
 */
const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.shape.borderRadius,
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    '&:hover': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused': {
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}25`,
    },
    '&.Mui-error': {
      borderColor: theme.palette.error.main,
      '&:hover': {
        borderColor: theme.palette.error.dark,
      },
    },
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
  '& .MuiInputBase-input': {
    '&::placeholder': {
      color: theme.palette.text.disabled,
      opacity: 0.7,
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  },
  // Enhanced RTL support
  '& .MuiInputBase-inputAdornedStart': {
    paddingLeft: theme.direction === 'rtl' ? 0 : 14,
    paddingRight: theme.direction === 'rtl' ? 14 : 0,
  },
}));

/**
 * Enhanced Input component with comprehensive validation, security features,
 * and accessibility compliance
 */
const Input: React.FC<InputProps> = ({
  id,
  name,
  label,
  value,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error = false,
  helperText,
  pattern,
  validationMessage,
  onChange,
  onBlur,
  onError,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  // Internal state management
  const [internalValue, setInternalValue] = useState(value);
  const [internalError, setInternalError] = useState<string>('');
  const [isTouched, setIsTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced validation to prevent excessive validation calls
  const [debouncedValidation] = useDebounce(
    () => validateInput(internalValue),
    300
  );

  /**
   * Validates input based on type and pattern requirements
   */
  const validateInput = useCallback((inputValue: string): boolean => {
    if (!inputValue && required) {
      const errorMessage = `${label} is required`;
      setInternalError(errorMessage);
      onError?.(errorMessage);
      return false;
    }

    if (pattern && inputValue) {
      const regex = new RegExp(pattern);
      if (!regex.test(inputValue)) {
        const errorMessage = validationMessage || `Invalid ${label.toLowerCase()} format`;
        setInternalError(errorMessage);
        onError?.(errorMessage);
        return false;
      }
    }

    // Type-specific validation
    if (inputValue) {
      switch (type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(inputValue)) {
            const errorMessage = 'Invalid email address';
            setInternalError(errorMessage);
            onError?.(errorMessage);
            return false;
          }
          break;
        case 'url':
          const urlRegex = /^https?:\/\/[\w-]+(\.[\w-]+)+[/#?]?.*$/;
          if (!urlRegex.test(inputValue)) {
            const errorMessage = 'Invalid URL format';
            setInternalError(errorMessage);
            onError?.(errorMessage);
            return false;
          }
          break;
        case 'tel':
          const telRegex = /^\+?[\d\s-()]+$/;
          if (!telRegex.test(inputValue)) {
            const errorMessage = 'Invalid phone number format';
            setInternalError(errorMessage);
            onError?.(errorMessage);
            return false;
          }
          break;
      }
    }

    setInternalError('');
    return true;
  }, [label, pattern, required, type, validationMessage, onError]);

  /**
   * Handles input value changes with enhanced security validation
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const rawValue = event.target.value;
    
    // Apply security sanitization based on input type
    const sanitizedValue = sanitizeInput(rawValue, {
      allowHtml: false,
      maxLength: type === 'tel' ? 20 : 255,
      trimWhitespace: true
    });

    setInternalValue(sanitizedValue);
    setIsTouched(true);
    
    // Trigger debounced validation
    debouncedValidation();
    
    // Propagate sanitized value
    onChange(sanitizedValue);
  }, [onChange, debouncedValidation, type]);

  /**
   * Handles input blur events with final validation
   */
  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    const isValid = validateInput(internalValue);
    setIsTouched(true);
    
    if (isValid) {
      setInternalError('');
    }
    
    onBlur?.();
  }, [internalValue, validateInput, onBlur]);

  // Sync internal value with prop value
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Enhanced keyboard accessibility
  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          input.blur();
        }
      });
    }
  }, []);

  return (
    <StyledTextField
      inputRef={inputRef}
      id={id}
      name={name}
      label={label}
      value={internalValue}
      type={type}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      error={error || (isTouched && !!internalError)}
      helperText={internalError || helperText}
      onChange={handleChange}
      onBlur={handleBlur}
      inputProps={{
        'aria-label': ariaLabel || label,
        'aria-describedby': ariaDescribedBy,
        'aria-required': required,
        'aria-invalid': error || !!internalError,
        pattern: pattern,
      }}
      {...props}
    />
  );
};

export default Input;