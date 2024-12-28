// ESLint configuration for React/TypeScript web frontend
// Dependencies:
// eslint: ^8.45.0
// @typescript-eslint/parser: ^6.0.0
// @typescript-eslint/eslint-plugin: ^6.0.0
// eslint-plugin-react: ^7.32.2
// eslint-plugin-react-hooks: ^4.6.0
// eslint-config-prettier: ^8.8.0
// eslint-plugin-import: ^2.27.5

module.exports = {
  // Set as root configuration to prevent ESLint from looking for other configs
  root: true,

  // Define execution environments
  env: {
    browser: true,      // Enable browser globals
    es2021: true,       // Enable ES2021 globals and syntax
    node: true,         // Enable Node.js globals
    jest: true,         // Enable Jest testing globals
  },

  // Extend recommended configurations and plugins
  extends: [
    'eslint:recommended',                       // ESLint recommended rules
    'plugin:@typescript-eslint/recommended',    // TypeScript recommended rules
    'plugin:react/recommended',                 // React recommended rules
    'plugin:react-hooks/recommended',           // React Hooks recommended rules
    'plugin:import/errors',                     // Import plugin error rules
    'plugin:import/warnings',                   // Import plugin warning rules
    'plugin:import/typescript',                 // Import plugin TypeScript support
    'prettier',                                 // Prettier integration
  ],

  // Configure TypeScript parser
  parser: '@typescript-eslint/parser',

  // Parser options for modern JavaScript and TypeScript
  parserOptions: {
    ecmaVersion: 'latest',                     // Use latest ECMAScript version
    sourceType: 'module',                      // Use ECMAScript modules
    ecmaFeatures: {
      jsx: true,                               // Enable JSX parsing
    },
    project: './tsconfig.json',                // Reference TypeScript configuration
  },

  // Enable required plugins
  plugins: [
    '@typescript-eslint',                      // TypeScript plugin
    'react',                                   // React plugin
    'react-hooks',                             // React Hooks plugin
    'import',                                  // Import organization plugin
  ],

  // Plugin-specific settings
  settings: {
    react: {
      version: 'detect',                       // Automatically detect React version
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,                 // Always try to resolve types
        project: './tsconfig.json',           // Reference TypeScript configuration
      },
    },
  },

  // Custom rule configurations
  rules: {
    // React specific rules
    'react/react-in-jsx-scope': 'off',         // Not needed in React 18+
    'react/prop-types': 'off',                 // Use TypeScript types instead
    
    // TypeScript specific rules
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Allow implicit return types
    '@typescript-eslint/no-explicit-any': 'warn',              // Warn on 'any' usage
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',                // Ignore unused args starting with underscore
      varsIgnorePattern: '^_',                // Ignore unused vars starting with underscore
      caughtErrorsIgnorePattern: '^_',        // Ignore unused error vars starting with underscore
    }],

    // Import organization rules
    'import/order': ['error', {
      groups: [
        'builtin',                            // Node.js built-in modules
        'external',                           // NPM dependencies
        'internal',                           // Internal modules
        'parent',                             // Parent directory imports
        'sibling',                            // Same directory imports
        'index',                              // Index file imports
      ],
      'newlines-between': 'always',           // Require newlines between import groups
      alphabetize: {
        order: 'asc',                         // Sort imports alphabetically
        caseInsensitive: true,                // Case-insensitive sorting
      },
    }],

    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',     // Enforce Rules of Hooks
    'react-hooks/exhaustive-deps': 'warn',     // Check effect dependencies
  },
};