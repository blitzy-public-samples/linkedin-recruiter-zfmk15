// ESLint configuration for LinkedIn Profile Search and Analysis System Backend Services
// Version: 1.0.0
// Dependencies:
// - eslint ^8.45.0
// - @typescript-eslint/parser ^5.62.0
// - @typescript-eslint/eslint-plugin ^5.62.0
// - eslint-config-prettier ^8.8.0
// - eslint-plugin-import ^2.27.5

export = {
  // Indicates this is a root configuration that should not be extended by others
  root: true,

  // Use TypeScript parser for enhanced linting capabilities
  parser: '@typescript-eslint/parser',

  // Parser options for modern TypeScript/ES features
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.json']
  },

  // Essential plugins for TypeScript and import management
  plugins: [
    '@typescript-eslint',
    'import'
  ],

  // Extended configurations for comprehensive linting coverage
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier' // Must be last to properly override other configs
  ],

  // Custom rule configurations
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/explicit-function-return-type': 'error', // Enforce return type declarations
    '@typescript-eslint/no-explicit-any': 'error', // Prevent usage of 'any' type
    '@typescript-eslint/no-unused-vars': 'error', // Catch unused variables
    '@typescript-eslint/no-floating-promises': 'error', // Ensure promises are properly handled

    // Import/Export rules
    'import/order': ['error', {
      'groups': [
        'builtin',    // Node.js built-in modules
        'external',   // NPM dependencies
        'internal',   // Internal modules
        'parent',     // Parent directory imports
        'sibling',    // Same directory imports
        'index'       // Index file imports
      ],
      'newlines-between': 'always', // Enforce newlines between import groups
      'alphabetize': {
        'order': 'asc', // Alphabetical ordering
        'caseInsensitive': true
      }
    }],

    // General code quality rules
    'no-console': 'warn',    // Warn about console.log usage
    'no-debugger': 'error'   // Prevent debugger statements
  },

  // Configuration settings
  settings: {
    'import/resolver': {
      'typescript': {
        'alwaysTryTypes': true // Enable TypeScript type imports resolution
      }
    }
  },

  // Patterns to ignore during linting
  ignorePatterns: [
    'dist',         // Built files
    'node_modules', // Dependencies
    'coverage',     // Test coverage reports
    '*.test.ts',    // Test files
    '*.spec.ts'     // Spec files
  ]
};