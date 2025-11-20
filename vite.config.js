import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    fs: {
      // Allow serving files from wasm directories
      allow: ['..']
    }
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  },
  optimizeDeps: {
    exclude: ['fast-check']
  },
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/emsdk/**',
      '**/.{idea,git,cache,output,temp}/**'
    ]
  }
});
