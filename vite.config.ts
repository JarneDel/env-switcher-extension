import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';

const targetBrowser = process.env.TARGET_BROWSER || 'chrome';

export default defineConfig(({mode}) => {
    const isDev = mode === 'development';

    return {
        plugins: [
            react(),
            webExtension({
                manifest: targetBrowser === 'firefox'
                    ? 'manifest-firefox.json'
                    : 'manifest.json',
                browser: targetBrowser as 'chrome' | 'firefox',
                // Disable auto-launching the browser (load the dist folder manually)
                disableAutoLaunch: true,
                watchFilePaths: ['src/**'],
            }),
        ],

        build: {
            outDir: targetBrowser === 'firefox' ? 'dist-firefox' : 'dist-chrome',
            emptyOutDir: true,
            sourcemap: isDev,
            // Use terser in production to strip console/debugger calls
            minify: isDev ? false : 'terser',
            terserOptions: isDev ? undefined : {
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                },
            },
        },

        define: {
            'process.env.NODE_ENV': JSON.stringify(mode || 'development'),
        },
    };
});