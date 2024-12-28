/**
 * @file SearchTemplates.tsx
 * @version 1.0.0
 * @description A React component for managing LinkedIn search templates with enhanced functionality
 * Implements requirements from sections 1.3 and 6.4 of technical specifications
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  List,
  ListItem,
  Button,
  TextField,
  Skeleton,
  Dialog,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ErrorBoundary } from 'react-error-boundary';

import { SearchTemplate, SearchCriteria, ApiError } from '../../../types/search.types';
import { searchService } from '../../../services/search.service';

// Interface for component props
interface SearchTemplatesProps {
  onTemplateSelect: (template: SearchTemplate) => void;
  currentCriteria?: SearchCriteria;
  onError?: (error: ApiError) => void;
  className?: string;
}

// Interface for template dialog state
interface TemplateDialogState {
  open: boolean;
  mode: 'create' | 'edit';
  template?: SearchTemplate;
}

/**
 * Custom hook for managing template operations with optimistic updates
 */
const useTemplateManager = () => {
  const [templates, setTemplates] = useState<SearchTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<ApiError | null>(null);
  const templateCache = useRef(new Map<string, SearchTemplate>());

  // Load templates with error handling
  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(prev => ({ ...prev, list: true }));
      const data = await searchService.getSearchTemplates();
      setTemplates(data);
      // Update cache
      data.forEach(template => templateCache.current.set(template.id, template));
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(prev => ({ ...prev, list: false }));
    }
  }, []);

  // Create template with optimistic update
  const createTemplate = useCallback(async (name: string, criteria: SearchCriteria) => {
    try {
      setIsLoading(prev => ({ ...prev, create: true }));
      const newTemplate = await searchService.saveSearchTemplate({ name, criteria });
      setTemplates(prev => [...prev, newTemplate]);
      templateCache.current.set(newTemplate.id, newTemplate);
      return newTemplate;
    } catch (err) {
      setError(err as ApiError);
      throw err;
    } finally {
      setIsLoading(prev => ({ ...prev, create: false }));
    }
  }, []);

  // Delete template with optimistic update
  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      setIsLoading(prev => ({ ...prev, [templateId]: true }));
      // Optimistic update
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      await searchService.deleteSearchTemplate(templateId);
      templateCache.current.delete(templateId);
    } catch (err) {
      // Revert optimistic update on error
      const cached = templateCache.current.get(templateId);
      if (cached) {
        setTemplates(prev => [...prev, cached]);
      }
      setError(err as ApiError);
      throw err;
    } finally {
      setIsLoading(prev => ({ ...prev, [templateId]: false }));
    }
  }, []);

  return {
    templates,
    isLoading,
    error,
    loadTemplates,
    createTemplate,
    deleteTemplate
  };
};

/**
 * SearchTemplates component for managing search templates
 */
export const SearchTemplates: React.FC<SearchTemplatesProps> = ({
  onTemplateSelect,
  currentCriteria,
  onError,
  className
}) => {
  const {
    templates,
    isLoading,
    error,
    loadTemplates,
    createTemplate,
    deleteTemplate
  } = useTemplateManager();

  const [dialogState, setDialogState] = useState<TemplateDialogState>({
    open: false,
    mode: 'create'
  });

  const [templateName, setTemplateName] = useState('');

  // Virtual list for performance optimization
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: templates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5
  });

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Report errors to parent
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Memoized template handlers
  const handleCreateTemplate = useCallback(async () => {
    if (!templateName.trim() || !currentCriteria) return;

    try {
      const newTemplate = await createTemplate(templateName, currentCriteria);
      setDialogState({ open: false, mode: 'create' });
      setTemplateName('');
      onTemplateSelect(newTemplate);
    } catch (err) {
      // Error already handled by useTemplateManager
    }
  }, [templateName, currentCriteria, createTemplate, onTemplateSelect]);

  const handleDeleteTemplate = useCallback(async (template: SearchTemplate) => {
    try {
      await deleteTemplate(template.id);
    } catch (err) {
      // Error already handled by useTemplateManager
    }
  }, [deleteTemplate]);

  // Render loading skeleton
  if (isLoading.list) {
    return (
      <Card className={className}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Search Templates
          </Typography>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} height={60} animation="wave" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <ErrorBoundary fallback={<div>Error loading templates</div>}>
      <Card className={className}>
        <CardContent>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Search Templates</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={() => setDialogState({ open: true, mode: 'create' })}
              disabled={!currentCriteria}
            >
              Save Current
            </Button>
          </div>

          <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
            <List style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map(virtualRow => {
                const template = templates[virtualRow.index];
                return (
                  <ListItem
                    key={template.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                    secondaryAction={
                      <div>
                        <IconButton
                          onClick={() => onTemplateSelect(template)}
                          aria-label="Apply template"
                        >
                          <ContentCopy />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteTemplate(template)}
                          disabled={isLoading[template.id]}
                          aria-label="Delete template"
                        >
                          {isLoading[template.id] ? <CircularProgress size={24} /> : <DeleteIcon />}
                        </IconButton>
                      </div>
                    }
                  >
                    <Typography>{template.name}</Typography>
                  </ListItem>
                );
              })}
            </List>
          </div>
        </CardContent>

        <Dialog
          open={dialogState.open}
          onClose={() => setDialogState({ open: false, mode: 'create' })}
          aria-labelledby="template-dialog-title"
        >
          <CardContent>
            <Typography id="template-dialog-title" variant="h6" gutterBottom>
              Save Search Template
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              margin="normal"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button
                onClick={() => setDialogState({ open: false, mode: 'create' })}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateTemplate}
                disabled={!templateName.trim() || isLoading.create}
              >
                {isLoading.create ? <CircularProgress size={24} /> : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Dialog>
      </Card>
    </ErrorBoundary>
  );
};

export default SearchTemplates;