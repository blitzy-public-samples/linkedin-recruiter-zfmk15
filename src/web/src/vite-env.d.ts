/// <reference types="vite/client" /> /* vite ^4.4.0 */

/**
 * Type definitions for Vite environment variables and client types.
 * Extends the base Vite environment interface with application-specific
 * environment variables and ensures type safety across the application.
 */

/**
 * Environment variable interface that defines all available environment variables
 * including both Vite defaults and custom application variables.
 * All properties are readonly to prevent accidental modification.
 */
interface ImportMetaEnv extends Readonly<{
  // Custom application environment variables
  /** API endpoint URL for backend services */
  VITE_API_URL: string;
  
  /** WebSocket endpoint URL for real-time communications */
  VITE_WS_URL: string;
  
  /** Claude AI API key for AI-powered profile analysis */
  VITE_CLAUDE_API_KEY: string;
  
  /** Current deployment environment */
  VITE_ENVIRONMENT: 'development' | 'staging' | 'production';

  // Vite default environment variables
  /** Current mode (development/production) */
  MODE: string;
  
  /** Base public path when served in development or production */
  BASE_URL: string;
  
  /** Boolean flag indicating production mode */
  PROD: boolean;
  
  /** Boolean flag indicating development mode */
  DEV: boolean;
  
  /** Boolean flag indicating server-side rendering mode */
  SSR: boolean;
}> {}

/**
 * Augments the ImportMeta interface to include the env property
 * with our custom environment variable types.
 */
interface ImportMeta {
  /** Strongly-typed environment variables */
  readonly env: ImportMetaEnv;
}