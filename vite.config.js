import { defineConfig } from 'vite';
import { resolve }       from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const r = (...p) => resolve(__dirname, ...p);

// Which build mode? Set via VITE_BUILD_TARGET env var (default: 'main')
const TARGET = process.env.VITE_BUILD_TARGET || 'main';

const isContent = TARGET === 'content';

export default defineConfig({
  build: {
    outDir:      r('dist'),
    emptyOutDir: !isContent,   // only wipe on first (main) pass
    publicDir:   isContent ? false : r('public'),

    rollupOptions: {
      input: isContent
        ? { content: r('src/content/index.js') }
        : {
            background: r('src/background/index.js'),
            popup:      r('src/popup/popup.js'),
          },

      output: isContent
        ? {
            format:         'iife',   // classic script — no import statements
            name:           'AIPageSummarizer',
            entryFileNames: '[name].js',
          }
        : {
            format:          'es',
            entryFileNames:  '[name].js',
            chunkFileNames:  'chunks/[name]-[hash].js',
            assetFileNames:  (a) =>
              a.name?.endsWith('.css') ? '[name][extname]' : 'assets/[name]-[hash][extname]',
          },
    },
  },

  resolve: {
    alias: {
      '@shared':     r('src/shared'),
      '@background': r('src/background'),
      '@content':    r('src/content'),
      '@popup':      r('src/popup'),
    },
  },
});