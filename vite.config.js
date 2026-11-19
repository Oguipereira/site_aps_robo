import { defineConfig } from 'vite';

// base relativa: funciona na raiz da Vercel, em subpastas e no GitHub Pages
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 900 },
});
