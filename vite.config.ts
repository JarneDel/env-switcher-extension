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
    sourcemap: true,
    minify: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.ts'),
        'content-script': resolve(__dirname, 'src/content-script.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content-script') {
            return '[name].js'
          }
          return 'assets/[name]-[hash].js'
        }
      }
    }
  }
})