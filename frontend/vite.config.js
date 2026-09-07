import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Asegurarse de que process.env esté definido para Sentry
    'process.env': {}
  },
  build: {
    sourcemap: true // Necesario para que Sentry funcione correctamente
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  }
})
