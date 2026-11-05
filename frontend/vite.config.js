import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // En desarrollo, /api y /uploads se redirigen al backend local.
  const backend = env.VITE_DEV_BACKEND || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': backend,
        '/uploads': backend,
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/setupTests.js'],
      css: false,
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            vendor: ['axios', '@tanstack/react-query', 'styled-components'],
          },
        },
      },
    },
  };
});
