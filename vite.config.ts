
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import hotReloadExtension from 'hot-reload-extension-vite';
import { resolve } from 'path';

const targetBrowser = process.env.TARGET_BROWSER || 'chrome';

export default defineConfig({
  plugins: [
    react(),

    // Hot reload plugin for extension development
    hotReloadExtension({
      log: true,
      backgroundPath: 'src/background.ts',
    }),

    viteStaticCopy({
      targets: [
        {
          src: targetBrowser === 'firefox' ? 'manifest-firefox.json' : 'manifest.json',
          dest: '.',
          rename: 'manifest.json'
        },
        { src: 'public/*', dest: 'public' }
      ]
    })
  ],

  build: {
    outDir: targetBrowser === 'firefox' ? 'dist-firefox' : 'dist-chrome',
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.ts'),
        'content-script': resolve(__dirname, 'src/content-script.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content-script') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});