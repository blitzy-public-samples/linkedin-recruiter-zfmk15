/**
 * @file SearchForm Component
 * @version 1.0.0
 * @description A comprehensive search form component implementing boolean search,
 * filters, and template management with real-time validation and accessibility support
 * 
 * Dependencies:
 * - react: ^18.0.0
 * - @mui/material: ^5.14.0
 * - react-hook-form: ^7.0.0
 * - use-debounce: ^9.0.0
 */

import React, { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Button,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  styled
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Help as HelpIcon
} from '@mui/icons-material';

import { SearchCriteria } from '../../types/search.types';
import { useSearch } from '../../hooks/useSearch';

// Styled components for enhanced accessibility and visual design
const FormContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  position: 'relative',
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px'
  }
}));

const SkillsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  minHeight: 56,
  '&[role="group"]': {
    padding: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    '&:focus-within': {
      borderColor: theme.palette.primary.main
    }
  }
}));

// Interface for component props
interface SearchFormProps {
  onSubmit: (criteria: SearchCriteria) => Promise<void>;
  initialValues?: SearchCriteria;
  isLoading?: boolean;
  onLiveUpdate?: (criteria: SearchCriteria) => void;
  templates?: Array<{ id: string; name: string; criteria: SearchCriteria }>;
  websocketStatus?: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
}

/**
 * SearchForm Component
 * Implements comprehensive search functionality with accessibility support
 */
export const SearchForm: React.FC<SearchFormProps> = ({
  onSubmit,
  initialValues,
  isLoading = false,
  onLiveUpdate,
  templates = [],
  websocketStatus
}) => {
  // Form validation and state management
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<SearchCriteria>({
    defaultValues: initialValues || {
      keywords: '',
      location: null,
      experienceYears: { min: undefined, max: undefined },
      requiredSkills: [],
      optionalSkills: []
    }
  });

  // Watch form values for live updates
  const formValues = watch();
  const [debouncedValues] = useDebounce(formValues, 500);

  // Custom hook for search functionality
  const { handleSearch, searchStatus } = useSearch();

  // Effect for live updates
  useEffect(() => {
    if (onLiveUpdate && websocketStatus === 'CONNECTED') {
      onLiveUpdate(debouncedValues);
    }
  }, [debouncedValues, onLiveUpdate, websocketStatus]);

  // Memoized skill suggestions
  const skillSuggestions = useMemo(() => [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python',
    'Java', 'AWS', 'Docker', 'Kubernetes', 'SQL'
  ], []);

  // Form submission handler
  const onFormSubmit = async (data: SearchCriteria) => {
    try {
      await onSubmit(data);
      handleSearch(data);
    } catch (error) {
      console.error('Search submission failed:', error);
    }
  };

  return (
    <FormContainer
      component="form"
      onSubmit={handleSubmit(onFormSubmit)}
      role="search"
      aria-label="LinkedIn profile search"
    >
      {/* Keywords Input */}
      <Controller
        name="keywords"
        control={control}
        rules={{ required: 'Keywords are required' }}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            label="Keywords"
            placeholder="Enter search keywords (e.g., 'Senior Developer AND (React OR Angular)')"
            error={!!errors.keywords}
            helperText={errors.keywords?.message || 'Use AND, OR, NOT operators for boolean search'}
            margin="normal"
            InputProps={{
              endAdornment: (
                <Tooltip title="Boolean Search Help">
                  <IconButton size="small" aria-label="search help">
                    <HelpIcon />
                  </IconButton>
                </Tooltip>
              )
            }}
          />
        )}
      />

      {/* Location Input */}
      <Controller
        name="location"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            label="Location"
            placeholder="Enter location (optional)"
            margin="normal"
          />
        )}
      />

      {/* Experience Range */}
      <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
        <Controller
          name="experienceYears.min"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              label="Min Experience (years)"
              InputProps={{ inputProps: { min: 0 } }}
              sx={{ flex: 1 }}
            />
          )}
        />
        <Controller
          name="experienceYears.max"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              label="Max Experience (years)"
              InputProps={{ inputProps: { min: 0 } }}
              sx={{ flex: 1 }}
            />
          )}
        />
      </Box>

      {/* Required Skills */}
      <FormControl fullWidth margin="normal">
        <InputLabel id="required-skills-label">Required Skills</InputLabel>
        <Controller
          name="requiredSkills"
          control={control}
          render={({ field }) => (
            <SkillsContainer role="group" aria-labelledby="required-skills-label">
              <Autocomplete
                multiple
                options={skillSuggestions}
                value={field.value}
                onChange={(_, newValue) => field.onChange(newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((skill, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={skill}
                      label={skill}
                      onDelete={() => {
                        const newSkills = [...field.value];
                        newSkills.splice(index, 1);
                        field.onChange(newSkills);
                      }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    placeholder="Add required skills"
                  />
                )}
              />
            </SkillsContainer>
          )}
        />
      </FormControl>

      {/* Optional Skills */}
      <FormControl fullWidth margin="normal">
        <InputLabel id="optional-skills-label">Optional Skills</InputLabel>
        <Controller
          name="optionalSkills"
          control={control}
          render={({ field }) => (
            <SkillsContainer role="group" aria-labelledby="optional-skills-label">
              <Autocomplete
                multiple
                options={skillSuggestions}
                value={field.value}
                onChange={(_, newValue) => field.onChange(newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((skill, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={skill}
                      label={skill}
                      onDelete={() => {
                        const newSkills = [...field.value];
                        newSkills.splice(index, 1);
                        field.onChange(newSkills);
                      }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    placeholder="Add optional skills"
                  />
                )}
              />
            </SkillsContainer>
          )}
        />
      </FormControl>

      {/* Template Selection */}
      {templates.length > 0 && (
        <FormControl fullWidth margin="normal">
          <InputLabel>Search Templates</InputLabel>
          <Select
            value=""
            onChange={(e) => {
              const template = templates.find(t => t.id === e.target.value);
              if (template) {
                Object.entries(template.criteria).forEach(([key, value]) => {
                  setValue(key as keyof SearchCriteria, value);
                });
              }
            }}
          >
            {templates.map(template => (
              <MenuItem key={template.id} value={template.id}>
                {template.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading}
          startIcon={<SearchIcon />}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
        
        <Button
          type="button"
          variant="outlined"
          startIcon={<SaveIcon />}
          onClick={() => {
            // Template save logic
          }}
        >
          Save Template
        </Button>
      </Box>

      {/* Status Indicators */}
      {websocketStatus && (
        <Typography
          variant="caption"
          color={websocketStatus === 'CONNECTED' ? 'success.main' : 'error.main'}
          sx={{ mt: 2, display: 'block' }}
        >
          {`Live Updates: ${websocketStatus}`}
        </Typography>
      )}
    </FormContainer>
  );
};

export default SearchForm;