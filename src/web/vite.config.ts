// vite.config.ts
// @vitejs/plugin-react v4.0.0
// vite v4.4.0
// path v18.0.0

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // React plugin configuration with Fast Refresh and optimizations
  plugins: [
    react({
      // Enable Fast Refresh for rapid development
      fastRefresh: true,
      // Production optimizations
      babel: {
        plugins: [
          ['@babel/plugin-transform-runtime'],
          process.env.NODE_ENV === 'production' && [
            'transform-react-remove-prop-types',
            { removeImport: true }
          ]
        ].filter(Boolean)
      }
    })
  ],

  // Path resolution and aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  // Development server configuration
  server: {
    port: 3000,
    strictPort: true,
    cors: true,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    },
    watch: {
      usePolling: true
    }
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    target: ['chrome90', 'firefox88', 'safari14', 'edge90'],
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production'
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for core React dependencies
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // MUI components chunk
          mui: ['@mui/material', '@mui/icons-material'],
          // State management chunk
          state: ['@reduxjs/toolkit', 'react-redux'],
          // Data fetching chunk
          query: ['@tanstack/react-query']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    reportCompressedSize: true
  },

  // Test environment configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        '**/*.d.ts',
        'src/vite-env.d.ts'
      ]
    }
  },

  // Environment variable configuration
  envPrefix: 'VITE_',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __DEV__: process.env.NODE_ENV === 'development'
  },

  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@reduxjs/toolkit',
      '@tanstack/react-query'
    ],
    exclude: ['@testing-library/react']
  },

  // Preview server configuration
  preview: {
    port: 3000,
    strictPort: true,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }
  },

  // CSS configuration
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase'
    },
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/styles/variables.scss";'
      }
    }
  }
});