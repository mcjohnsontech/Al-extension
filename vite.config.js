import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: 'src/background/background.js',
        content: 'src/content/content.js',
        popup: 'src/popup/popup.js',
      },
      output: {
        entryFileNames: '[name].js',
      }
    }
  }
});