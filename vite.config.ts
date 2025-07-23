import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { resolve } from 'path'

// Get target browser from environment variable
const targetBrowser = process.env.TARGET_BROWSER || 'chrome';

export default defineConfig({
  plugins: [
    react(),
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
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.ts'),
        'content-script': resolve(__dirname, 'src/content-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Extension scripts should not be hashed
          if (chunkInfo.name === 'background' ||
              chunkInfo.name === 'content-script' ||
              chunkInfo.name === 'changeFavicons') {
            return '[name].js'
          }
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Don't inline dynamic imports when we have multiple inputs
        inlineDynamicImports: false
      }
    }
  },
  define: {
    global: 'globalThis',
  }
})