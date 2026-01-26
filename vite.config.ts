import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Determine build mode:
  // - 'web' mode: for web deployment (server mode)
  // - 'tauri' mode: for Tauri desktop app
  // - default: detect from TAURI_* env vars (Tauri) or assume web
  const isTauriEnv = process.env.TAURI_PLATFORM !== undefined || process.env.TAURI_FAMILY !== undefined;
  const isWeb = mode === 'web' || (!isTauriEnv && mode !== 'tauri');
  const isTauri = mode === 'tauri' || (isTauriEnv && mode !== 'web');

  return {
    plugins: [react()],
    clearScreen: false,
    server: {
      // Web mode uses port 5173 (Vite default) for connecting to server on port 3000
      // Tauri mode uses port 1420 (Tauri default)
      port: isWeb ? 5173 : 1420,
      strictPort: true,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
    envPrefix: ['VITE_', 'TAURI_'],
    build: {
      // Web builds target modern browsers
      // Tauri builds target specific browser versions
      target: isTauri
        ? (process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13')
        : 'esnext',
      minify: process.env.TAURI_DEBUG ? false : 'esbuild',
      sourcemap: !!process.env.TAURI_DEBUG || process.env.NODE_ENV === 'development',
      outDir: 'dist',
      // Web builds can be more aggressive with chunking
      rollupOptions: isWeb
        ? {
            output: {
              manualChunks: {
                vendor: ['react', 'react-dom'],
                pixi: ['pixi.js'],
                store: ['zustand', 'immer'],
              },
            },
          }
        : undefined,
    },
  };
});
