import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './', plugins: [react()],
  build: { outDir: '../dist-expo', emptyOutDir: true },
  server: { host: '0.0.0.0', port: 4175, strictPort: true },
});
