/**
 * @fileoverview Reusable select/dropdown component with comprehensive accessibility support
 * @version 1.0.0
 * @description Implements Material Design 3.0 select component with single/multiple selection,
 * search filtering, keyboard navigation and WCAG 2.1 AA compliance
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Select as MuiSelect, MenuItem, FormControl, FormHelperText, InputLabel } from '@mui/material'; // v5.14.0
import { styled } from '@mui/material/styles'; // v5.14.0
import { sanitizeInput } from '../../utils/validation';

// Styled components with Material Design 3.0 specifications
const StyledSelect = styled(MuiSelect)(({ theme, error }) => ({
  '& .MuiSelect-select': {
    minHeight: 20,
    padding: theme.spacing(1.5),
    '&:focus': {
      backgroundColor: 'transparent',
      boxShadow: 'none',
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: error ? theme.palette.error.main : theme.palette.divider,
    borderRadius: theme.shape.borderRadius,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: error ? theme.palette.error.main : theme.palette.primary.main,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: error ? theme.palette.error.main : theme.palette.primary.main,
    borderWidth: 2,
  },
  '&.Mui-disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    opacity: 0.7,
  },
  // Enhanced touch targets for mobile
  '@media (pointer: coarse)': {
    '& .MuiSelect-select': {
      minHeight: 24,
      padding: theme.spacing(1.75),
    },
  },
}));

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  minHeight: 40,
  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.light,
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
    },
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&.Mui-disabled': {
    opacity: 0.5,
  },
  // Enhanced touch targets for mobile
  '@media (pointer: coarse)': {
    minHeight: 48,
    padding: theme.spacing(1.5, 2),
  },
}));

// Interfaces
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
  metadata?: any;
}

export interface SelectProps {
  id: string;
  name: string;
  label: string;
  value: string | string[];
  options: SelectOption[];
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  searchable?: boolean;
  size?: 'small' | 'medium' | 'large';
  maxHeight?: number;
  customStyles?: object;
  testId?: string;
  onChange: (value: string | string[]) => void;
  onBlur?: () => void;
}

/**
 * Enhanced select component with comprehensive accessibility support
 * @param props SelectProps configuration object
 * @returns Accessible select component
 */
const Select: React.FC<SelectProps> = React.memo(({
  id,
  name,
  label,
  value,
  options,
  multiple = false,
  required = false,
  disabled = false,
  error = false,
  helperText,
  searchable = false,
  size = 'medium',
  maxHeight = 300,
  customStyles = {},
  testId = 'select-component',
  onChange,
  onBlur,
}) => {
  // State for search functionality
  const [searchText, setSearchText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Memoized filtered options
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchText) return options;
    
    const sanitizedSearch = sanitizeInput(searchText.toLowerCase(), {
      trimWhitespace: true,
      maxLength: 100
    });

    return options.filter(option => 
      option.label.toLowerCase().includes(sanitizedSearch) ||
      option.value.toLowerCase().includes(sanitizedSearch)
    );
  }, [options, searchText, searchable]);

  // Group options if groups are present
  const groupedOptions = useMemo(() => {
    const groups: { [key: string]: SelectOption[] } = {};
    
    filteredOptions.forEach(option => {
      const group = option.group || 'default';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(option);
    });
    
    return groups;
  }, [filteredOptions]);

  // Handlers
  const handleChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    event.preventDefault();
    const newValue = event.target.value;
    
    if (multiple) {
      const selectedValues = Array.isArray(newValue) ? newValue : [newValue as string];
      onChange(selectedValues);
    } else {
      onChange(newValue as string);
    }
  }, [multiple, onChange]);

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = sanitizeInput(event.target.value, {
      trimWhitespace: true,
      maxLength: 100
    });
    setSearchText(sanitizedValue);
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSearchText('');
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchText('');
  }, []);

  // Render menu items
  const renderMenuItems = useCallback(() => {
    if (Object.keys(groupedOptions).length === 1 && groupedOptions.default) {
      return groupedOptions.default.map((option) => (
        <StyledMenuItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          data-testid={`${testId}-option-${option.value}`}
        >
          {option.label}
        </StyledMenuItem>
      ));
    }

    return Object.entries(groupedOptions).map(([group, groupOptions]) => [
      group !== 'default' && (
        <MenuItem
          key={group}
          disabled
          sx={{ fontWeight: 'bold', opacity: 0.7 }}
        >
          {group}
        </MenuItem>
      ),
      ...groupOptions.map((option) => (
        <StyledMenuItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          data-testid={`${testId}-option-${option.value}`}
        >
          {option.label}
        </StyledMenuItem>
      )),
    ]);
  }, [groupedOptions, testId]);

  return (
    <FormControl
      fullWidth
      error={error}
      disabled={disabled}
      required={required}
      data-testid={testId}
    >
      <InputLabel
        id={`${id}-label`}
        shrink={!!value}
      >
        {label}
      </InputLabel>
      
      <StyledSelect
        labelId={`${id}-label`}
        id={id}
        name={name}
        value={value}
        multiple={multiple}
        onChange={handleChange}
        onBlur={onBlur}
        onOpen={handleOpen}
        onClose={handleClose}
        open={isOpen}
        size={size}
        sx={{
          ...customStyles,
          maxHeight: maxHeight,
        }}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: maxHeight,
            },
          },
          // Enhanced keyboard navigation
          autoFocus: false,
          disableAutoFocusItem: true,
        }}
        // Accessibility attributes
        aria-label={label}
        aria-required={required}
        aria-invalid={error}
        aria-describedby={helperText ? `${id}-helper-text` : undefined}
      >
        {searchable && (
          <MenuItem
            dense
            sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}
          >
            <input
              type="text"
              placeholder="Search..."
              value={searchText}
              onChange={handleSearch}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                padding: '8px',
              }}
            />
          </MenuItem>
        )}
        
        {renderMenuItems()}
      </StyledSelect>

      {helperText && (
        <FormHelperText id={`${id}-helper-text`}>
          {helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
});

Select.displayName = 'Select';

export default Select;