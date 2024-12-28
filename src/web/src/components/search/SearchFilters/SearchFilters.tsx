/**
 * @file SearchFilters Component
 * @version 1.0.0
 * @description Implements an accessible, performant search filters panel for LinkedIn profile search
 * with real-time updates, validation, and error handling
 */

import React, { useCallback, useEffect, useState } from 'react';
import { 
  Box, 
  Paper,
  TextField,
  Slider,
  Chip,
  Typography,
  IconButton,
  Collapse,
  useMediaQuery,
  useTheme
} from '@mui/material'; // v5.14.0
import { styled } from '@mui/material/styles'; // v5.14.0
import { useDebounce } from 'use-debounce'; // v9.0.0
import DeleteIcon from '@mui/icons-material/Delete'; // v5.14.0
import ExpandLessIcon from '@mui/icons-material/ExpandLess'; // v5.14.0
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // v5.14.0

import { SearchCriteria } from '../../types/search.types';
import { Select } from '../../components/common/Select/Select';
import { useSearch } from '../../hooks/useSearch';
import { sanitizeInput } from '../../utils/validation';

// Styled components with Material Design 3.0 specifications
const FilterContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  width: '280px',
  height: '100%',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.down('md')]: {
    width: '100%',
    marginBottom: theme.spacing(2)
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px'
  }
}));

const FilterSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  paddingBottom: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:last-child': {
    borderBottom: 'none',
    marginBottom: 0,
    paddingBottom: 0
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px'
  }
}));

// Interfaces
interface SearchFiltersProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isLoading: boolean;
  error?: string;
  onClearFilters: () => void;
}

interface FilterError {
  location: string | null;
  experience: string | null;
  skills: string | null;
}

/**
 * Custom hook for managing filter state with validation and debouncing
 */
const useFilterState = (initialCriteria: SearchCriteria) => {
  const [criteria, setCriteria] = useState<SearchCriteria>(initialCriteria);
  const [errors, setErrors] = useState<FilterError>({
    location: null,
    experience: null,
    skills: null
  });

  const [debouncedCriteria] = useDebounce(criteria, 300);
  const { handleSearch } = useSearch();

  useEffect(() => {
    handleSearch(debouncedCriteria);
  }, [debouncedCriteria, handleSearch]);

  return {
    criteria,
    setCriteria,
    errors,
    setErrors
  };
};

/**
 * SearchFilters Component
 * Implements comprehensive search filters with accessibility and real-time updates
 */
export const SearchFilters: React.FC<SearchFiltersProps> = ({
  isCollapsed,
  onToggleCollapse,
  isLoading,
  error,
  onClearFilters
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { criteria, setCriteria, errors, setErrors } = useFilterState({
    keywords: '',
    location: null,
    experienceYears: { min: 0, max: 15 },
    requiredSkills: [],
    optionalSkills: []
  });

  // Handlers
  const handleLocationChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = sanitizeInput(event.target.value, {
      trimWhitespace: true,
      maxLength: 100
    });

    setCriteria(prev => ({
      ...prev,
      location: value || null
    }));

    setErrors(prev => ({
      ...prev,
      location: null
    }));
  }, [setCriteria, setErrors]);

  const handleExperienceChange = useCallback((event: Event, newValue: number | number[]) => {
    const [min, max] = newValue as number[];
    
    if (min > max) {
      setErrors(prev => ({
        ...prev,
        experience: 'Minimum experience cannot exceed maximum'
      }));
      return;
    }

    setCriteria(prev => ({
      ...prev,
      experienceYears: { min, max }
    }));

    setErrors(prev => ({
      ...prev,
      experience: null
    }));
  }, [setCriteria, setErrors]);

  const handleSkillAdd = useCallback((skill: string, isRequired: boolean) => {
    const sanitizedSkill = sanitizeInput(skill, {
      trimWhitespace: true,
      maxLength: 50
    });

    if (!sanitizedSkill) return;

    setCriteria(prev => {
      const targetArray = isRequired ? 'requiredSkills' : 'optionalSkills';
      const otherArray = isRequired ? 'optionalSkills' : 'requiredSkills';

      // Check for duplicates across both arrays
      if (
        prev[targetArray].includes(sanitizedSkill) ||
        prev[otherArray].includes(sanitizedSkill)
      ) {
        setErrors(prev => ({
          ...prev,
          skills: 'Skill already added'
        }));
        return prev;
      }

      return {
        ...prev,
        [targetArray]: [...prev[targetArray], sanitizedSkill]
      };
    });

    setErrors(prev => ({
      ...prev,
      skills: null
    }));
  }, [setCriteria, setErrors]);

  const handleSkillRemove = useCallback((skill: string, isRequired: boolean) => {
    setCriteria(prev => {
      const targetArray = isRequired ? 'requiredSkills' : 'optionalSkills';
      return {
        ...prev,
        [targetArray]: prev[targetArray].filter(s => s !== skill)
      };
    });
  }, [setCriteria]);

  return (
    <FilterContainer
      role="complementary"
      aria-label="Search Filters"
      data-testid="search-filters"
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Filters
        </Typography>
        <Box>
          <IconButton
            onClick={onClearFilters}
            disabled={isLoading}
            aria-label="Clear all filters"
            size="small"
          >
            <DeleteIcon />
          </IconButton>
          <IconButton
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand filters" : "Collapse filters"}
            size="small"
          >
            {isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={!isCollapsed}>
        {error && (
          <Typography color="error" variant="body2" mb={2}>
            {error}
          </Typography>
        )}

        <FilterSection role="region" aria-label="Location">
          <TextField
            fullWidth
            label="Location"
            value={criteria.location || ''}
            onChange={handleLocationChange}
            error={!!errors.location}
            helperText={errors.location}
            disabled={isLoading}
            placeholder="Enter location..."
            InputProps={{
              'aria-label': 'Location filter'
            }}
          />
        </FilterSection>

        <FilterSection role="region" aria-label="Experience">
          <Typography gutterBottom>
            Experience Range (years)
          </Typography>
          <Slider
            value={[criteria.experienceYears.min || 0, criteria.experienceYears.max || 15]}
            onChange={handleExperienceChange}
            valueLabelDisplay="auto"
            min={0}
            max={15}
            step={1}
            disabled={isLoading}
            aria-label="Experience range"
            getAriaValueText={(value) => `${value} years`}
          />
          {errors.experience && (
            <Typography color="error" variant="caption">
              {errors.experience}
            </Typography>
          )}
        </FilterSection>

        <FilterSection role="region" aria-label="Required Skills">
          <Typography gutterBottom>
            Required Skills
          </Typography>
          <Box mb={1}>
            <Select
              id="required-skills"
              name="required-skills"
              label="Add Required Skill"
              value=""
              options={[]}
              onChange={(value) => handleSkillAdd(value as string, true)}
              disabled={isLoading}
              searchable
              error={!!errors.skills}
              helperText={errors.skills}
            />
          </Box>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {criteria.requiredSkills.map(skill => (
              <Chip
                key={skill}
                label={skill}
                onDelete={() => handleSkillRemove(skill, true)}
                disabled={isLoading}
              />
            ))}
          </Box>
        </FilterSection>

        <FilterSection role="region" aria-label="Optional Skills">
          <Typography gutterBottom>
            Optional Skills
          </Typography>
          <Box mb={1}>
            <Select
              id="optional-skills"
              name="optional-skills"
              label="Add Optional Skill"
              value=""
              options={[]}
              onChange={(value) => handleSkillAdd(value as string, false)}
              disabled={isLoading}
              searchable
              error={!!errors.skills}
              helperText={errors.skills}
            />
          </Box>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {criteria.optionalSkills.map(skill => (
              <Chip
                key={skill}
                label={skill}
                onDelete={() => handleSkillRemove(skill, false)}
                disabled={isLoading}
              />
            ))}
          </Box>
        </FilterSection>
      </Collapse>
    </FilterContainer>
  );
};

export default SearchFilters;