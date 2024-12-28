import React, { useState, useCallback, useEffect } from 'react';
import { 
  Grid, 
  Typography, 
  Switch, 
  Select, 
  MenuItem, 
  Button, 
  Skeleton, 
  Dialog,
  Snackbar,
  useTheme,
  alpha
} from '@mui/material';
import { useTranslation } from 'react-i18next'; // v13.0+
import MainLayout from '../../components/layout/MainLayout/MainLayout';
import Card from '../../components/common/Card/Card';
import useAuth from '../../hooks/useAuth';

// Interface for settings form data
interface SettingsFormData {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'es' | 'fr';
  emailNotifications: boolean;
  searchAlerts: boolean;
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
}

// Available timezones
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
] as const;

// Settings component with comprehensive preference management
const Settings: React.FC = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { user, updateUserPreferences } = useAuth();

  // State management
  const [formData, setFormData] = useState<SettingsFormData>({
    theme: 'system',
    language: 'en',
    emailNotifications: true,
    searchAlerts: true,
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    type: 'success' as 'success' | 'error'
  });

  // Load user preferences
  useEffect(() => {
    if (user?.preferences) {
      setFormData({
        ...formData,
        ...user.preferences
      });
      setLoading(false);
    }
  }, [user]);

  // Handle form field changes
  const handleChange = useCallback((field: keyof SettingsFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle theme change with system preference detection
  const handleThemeChange = useCallback((value: 'light' | 'dark' | 'system') => {
    handleChange('theme', value);
    if (value === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemTheme);
    } else {
      document.documentElement.setAttribute('data-theme', value);
    }
  }, [handleChange]);

  // Handle language change with RTL support
  const handleLanguageChange = useCallback((value: string) => {
    handleChange('language', value);
    i18n.changeLanguage(value);
    document.documentElement.lang = value;
    document.documentElement.dir = ['ar', 'he'].includes(value) ? 'rtl' : 'ltr';
  }, [handleChange, i18n]);

  // Save settings with optimistic updates
  const handleSave = async () => {
    try {
      setSaving(true);
      await updateUserPreferences(formData);
      setSnackbar({
        open: true,
        message: t('common.labels.success'),
        type: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: t('common.errors.serverError'),
        type: 'error'
      });
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  // Reset settings confirmation
  const handleReset = () => {
    setShowConfirmDialog(true);
  };

  // Render loading skeleton
  if (loading) {
    return (
      <MainLayout>
        <Grid container spacing={3}>
          {[1, 2, 3].map((item) => (
            <Grid item xs={12} key={item}>
              <Skeleton 
                variant="rectangular" 
                height={200} 
                sx={{ borderRadius: theme.shape.borderRadius }}
              />
            </Grid>
          ))}
        </Grid>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Grid container spacing={3}>
        {/* Appearance Settings */}
        <Grid item xs={12}>
          <Card>
            <Typography variant="h5" gutterBottom>
              {t('common.navigation.settings')}
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('settings.appearance.theme')}
                </Typography>
                <Select
                  fullWidth
                  value={formData.theme}
                  onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'system')}
                  aria-label={t('settings.accessibility.themeSelection')}
                >
                  <MenuItem value="light">{t('settings.appearance.light')}</MenuItem>
                  <MenuItem value="dark">{t('settings.appearance.dark')}</MenuItem>
                  <MenuItem value="system">{t('settings.appearance.system')}</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('settings.appearance.language')}
                </Typography>
                <Select
                  fullWidth
                  value={formData.language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  aria-label={t('settings.accessibility.languageSelection')}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Español</MenuItem>
                  <MenuItem value="fr">Français</MenuItem>
                </Select>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12}>
          <Card>
            <Typography variant="h6" gutterBottom>
              {t('settings.notifications.title')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" display="inline-block">
                  {t('settings.notifications.email')}
                </Typography>
                <Switch
                  checked={formData.emailNotifications}
                  onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                  aria-label={t('settings.accessibility.emailNotifications')}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" display="inline-block">
                  {t('settings.notifications.searchAlerts')}
                </Typography>
                <Switch
                  checked={formData.searchAlerts}
                  onChange={(e) => handleChange('searchAlerts', e.target.checked)}
                  aria-label={t('settings.accessibility.searchAlerts')}
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Regional Settings */}
        <Grid item xs={12}>
          <Card>
            <Typography variant="h6" gutterBottom>
              {t('settings.regional.title')}
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('settings.regional.timezone')}
                </Typography>
                <Select
                  fullWidth
                  value={formData.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  aria-label={t('settings.accessibility.timezoneSelection')}
                >
                  {TIMEZONES.map((zone) => (
                    <MenuItem key={zone} value={zone}>{zone}</MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('settings.regional.dateFormat')}
                </Typography>
                <Select
                  fullWidth
                  value={formData.dateFormat}
                  onChange={(e) => handleChange('dateFormat', e.target.value)}
                  aria-label={t('settings.accessibility.dateFormatSelection')}
                >
                  <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                  <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                  <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                </Select>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Grid container spacing={2} justifyContent="flex-end">
            <Grid item>
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={saving}
                aria-label={t('settings.accessibility.resetSettings')}
              >
                {t('common.buttons.reset')}
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                aria-label={t('settings.accessibility.saveSettings')}
              >
                {saving ? t('common.labels.saving') : t('common.buttons.save')}
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        aria-labelledby="reset-dialog-title"
      >
        <Typography variant="h6" id="reset-dialog-title" sx={{ p: 2 }}>
          {t('settings.confirmReset.title')}
        </Typography>
        <Typography sx={{ px: 2, pb: 2 }}>
          {t('settings.confirmReset.message')}
        </Typography>
        <Grid container spacing={2} sx={{ p: 2 }} justifyContent="flex-end">
          <Grid item>
            <Button onClick={() => setShowConfirmDialog(false)}>
              {t('common.buttons.cancel')}
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                setFormData({
                  theme: 'system',
                  language: 'en',
                  emailNotifications: true,
                  searchAlerts: true,
                  timezone: 'UTC',
                  dateFormat: 'MM/DD/YYYY',
                });
                setShowConfirmDialog(false);
              }}
            >
              {t('common.buttons.reset')}
            </Button>
          </Grid>
        </Grid>
      </Dialog>

      {/* Status Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        sx={{
          '& .MuiSnackbarContent-root': {
            backgroundColor: snackbar.type === 'success' 
              ? theme.palette.success.main 
              : theme.palette.error.main
          }
        }}
      />
    </MainLayout>
  );
};

export default Settings;