// @reduxjs/toolkit version 1.9+
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Type definitions
export type ThemeMode = 'light' | 'dark' | 'system';
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type AriaLiveType = 'polite' | 'assertive';

export interface NotificationAction {
  label: string;
  action: () => void;
  ariaLabel?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration: number;
  priority: number;
  ariaLive: AriaLiveType;
  actions?: NotificationAction[];
  dismissible?: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  startTime: number;
  timeout: number | null;
  error: string | null;
}

export interface Announcement {
  id: string;
  message: string;
  ariaLive: AriaLiveType;
  timestamp: number;
}

export interface UIState {
  theme: ThemeMode;
  themeTransitioning: boolean;
  systemThemePreference: ThemeMode | null;
  isSidebarOpen: boolean;
  sidebarBreakpoint: number;
  activeModal: string | null;
  modalStack: string[];
  loadingStates: Record<string, LoadingState>;
  notifications: Notification[];
  accessibilityAnnouncements: Announcement[];
}

// Constants
const THEME_TRANSITION_DURATION = 300;
const NOTIFICATION_STACK_LIMIT = 5;
const LOADING_STATE_TIMEOUT = 30000;

// Initial state
const initialState: UIState = {
  theme: 'system',
  themeTransitioning: false,
  systemThemePreference: null,
  isSidebarOpen: true,
  sidebarBreakpoint: 1024,
  activeModal: null,
  modalStack: [],
  loadingStates: {},
  notifications: [],
  accessibilityAnnouncements: [],
};

// Create the slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.themeTransitioning = true;
      state.theme = action.payload;
      localStorage.setItem('theme-preference', action.payload);
      
      // Theme transition will be handled by a middleware
      setTimeout(() => {
        state.themeTransitioning = false;
      }, THEME_TRANSITION_DURATION);
    },

    setSystemThemePreference: (state, action: PayloadAction<ThemeMode>) => {
      state.systemThemePreference = action.payload;
    },

    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },

    setSidebarBreakpoint: (state, action: PayloadAction<number>) => {
      state.sidebarBreakpoint = action.payload;
    },

    openModal: (state, action: PayloadAction<string>) => {
      state.modalStack.push(action.payload);
      state.activeModal = action.payload;
    },

    closeModal: (state) => {
      state.modalStack.pop();
      state.activeModal = state.modalStack[state.modalStack.length - 1] || null;
    },

    closeAllModals: (state) => {
      state.modalStack = [];
      state.activeModal = null;
    },

    setLoadingState: (state, action: PayloadAction<{ key: string; isLoading: boolean; error?: string }>) => {
      const { key, isLoading, error } = action.payload;
      
      if (isLoading) {
        state.loadingStates[key] = {
          isLoading: true,
          startTime: Date.now(),
          timeout: LOADING_STATE_TIMEOUT,
          error: null,
        };
      } else {
        if (state.loadingStates[key]) {
          state.loadingStates[key].isLoading = false;
          state.loadingStates[key].error = error || null;
        }
      }
    },

    clearLoadingState: (state, action: PayloadAction<string>) => {
      delete state.loadingStates[action.payload];
    },

    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const notification: Notification = {
        ...action.payload,
        id,
        ariaLive: action.payload.ariaLive || 'polite',
        dismissible: action.payload.dismissible ?? true,
      };

      // Maintain priority queue and stack limit
      state.notifications = [
        ...state.notifications,
        notification,
      ]
        .sort((a, b) => b.priority - a.priority)
        .slice(0, NOTIFICATION_STACK_LIMIT);
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },

    addAnnouncement: (state, action: PayloadAction<Omit<Announcement, 'id' | 'timestamp'>>) => {
      const announcement: Announcement = {
        ...action.payload,
        id: `announcement-${Date.now()}`,
        timestamp: Date.now(),
      };
      state.accessibilityAnnouncements.push(announcement);
    },

    clearAnnouncement: (state, action: PayloadAction<string>) => {
      state.accessibilityAnnouncements = state.accessibilityAnnouncements.filter(
        announcement => announcement.id !== action.payload
      );
    },
  },
});

// Export actions and reducer
export const {
  setTheme,
  setSystemThemePreference,
  toggleSidebar,
  setSidebarBreakpoint,
  openModal,
  closeModal,
  closeAllModals,
  setLoadingState,
  clearLoadingState,
  addNotification,
  removeNotification,
  addAnnouncement,
  clearAnnouncement,
} = uiSlice.actions;

// Memoized selectors
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectIsThemeTransitioning = (state: { ui: UIState }) => state.ui.themeTransitioning;
export const selectSystemThemePreference = (state: { ui: UIState }) => state.ui.systemThemePreference;
export const selectIsSidebarOpen = (state: { ui: UIState }) => state.ui.isSidebarOpen;
export const selectSidebarBreakpoint = (state: { ui: UIState }) => state.ui.sidebarBreakpoint;
export const selectActiveModal = (state: { ui: UIState }) => state.ui.activeModal;
export const selectModalStack = (state: { ui: UIState }) => state.ui.modalStack;
export const selectLoadingStates = (state: { ui: UIState }) => state.ui.loadingStates;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectAccessibilityAnnouncements = (state: { ui: UIState }) => 
  state.ui.accessibilityAnnouncements;

// Default export
export default uiSlice.reducer;