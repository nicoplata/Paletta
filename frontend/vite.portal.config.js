import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Portal de familias de egresados: se publica en egresados.paletta.com.ar/mi-promo/
// (build aparte para no chocar con las rutas del sitio estático de egresados).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_DEV_BACKEND || 'http://localhost:3000';
  return {
    root: resolve(__dirname, 'portal'),
    base: '/mi-promo/',
    publicDir: false,
    cacheDir: resolve(__dirname, 'node_modules/.vite-portal'),
    envDir: __dirname,
    plugins: [react()],
    server: {
      port: 5174,
      proxy: { '/api': backend },
    },
    build: {
      outDir: resolve(__dirname, 'dist-portal/mi-promo'),
      emptyOutDir: true,
      sourcemap: false,
    },
  };
});
