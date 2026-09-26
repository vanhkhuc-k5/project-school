import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load the appropriate .env file based on mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      open: false,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    define: {
      'import.meta.env.NODE_ENV': JSON.stringify(env.NODE_ENV || mode),
    },
    build: {
      rollupOptions: {
        output: {
          // Manual chunks for vendor splitting
          manualChunks: {
            // React core
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
      // Target modern browsers for smaller bundles
      target: 'esnext',
      // Enable source maps for debugging
      sourcemap: false,
    },
  };
});
