/**
 * @file Redux Store Configuration
 * @version 1.0.0
 * @description Enterprise-grade Redux store configuration with TypeScript support,
 * secure state persistence, optimized performance, and comprehensive development tools
 */

import { configureStore, combineReducers, Middleware } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  createTransform,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { createLogger } from 'redux-logger';
import { encryptTransform } from 'redux-persist-transform-encrypt';

// Import reducers
import authReducer from './slices/authSlice';
import searchReducer from './slices/searchSlice';
import profileReducer from './slices/profileSlice';
import uiReducer from './slices/uiSlice';

// Store configuration interface
export interface StoreConfig {
  enableDevTools: boolean;
  enableLogging: boolean;
  persistenceKey: string;
  encryptionKey: string;
}

// Default configuration
const DEFAULT_CONFIG: StoreConfig = {
  enableDevTools: process.env.NODE_ENV === 'development',
  enableLogging: process.env.NODE_ENV === 'development',
  persistenceKey: 'linkedin-search-root',
  encryptionKey: process.env.VITE_STORAGE_ENCRYPTION_KEY || 'default-dev-key'
};

// Create root reducer with all slices
const createRootReducer = () => combineReducers({
  auth: authReducer,
  search: searchReducer,
  profile: profileReducer,
  ui: uiReducer
});

// Configure secure persistence
const configurePersistence = (config: StoreConfig) => {
  // Create encryption transform
  const secureTransform = encryptTransform({
    secretKey: config.encryptionKey,
    onError: (error) => {
      console.error('Persistence encryption error:', error);
    }
  });

  // Configure persistence
  return {
    key: config.persistenceKey,
    storage,
    transforms: [secureTransform],
    whitelist: ['auth'], // Only persist auth state
    blacklist: ['ui', 'search.results', 'profile.cache'], // Never persist these
    timeout: 10000, // 10 second timeout
    writeFailHandler: (err) => {
      console.error('Redux persist write failure:', err);
    }
  };
};

/**
 * Configure and create the Redux store with all enhancements
 * @param config Store configuration options
 * @returns Configured store instance
 */
export const setupStore = (config: StoreConfig = DEFAULT_CONFIG) => {
  // Create root reducer with persistence
  const rootReducer = createRootReducer();
  const persistConfig = configurePersistence(config);
  const persistedReducer = persistReducer(persistConfig, rootReducer);

  // Configure middleware
  const middleware: Middleware[] = [];

  // Add logging in development
  if (config.enableLogging) {
    middleware.push(createLogger({
      collapsed: true,
      duration: true,
      timestamp: false,
      diff: true
    }));
  }

  // Create store with all enhancements
  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
      },
      thunk: true,
      immutableCheck: true
    }).concat(middleware),
    devTools: config.enableDevTools && {
      name: 'LinkedIn Search Store',
      trace: true,
      traceLimit: 25
    }
  });

  // Create persistor
  const persistor = persistStore(store, null, () => {
    console.log('Redux store rehydration complete');
  });

  return { store, persistor };
};

// Create store instance
const { store, persistor } = setupStore();

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export store and persistor
export { store, persistor };

// Export type-safe hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;