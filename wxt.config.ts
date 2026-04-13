import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    srcDir: 'src',

    modules: ['@wxt-dev/module-react'],

    imports: false,

    manifest: {
        name: 'Environment Switcher',
        version: '1.0.8',
        description: 'Switch between different environments and languages with ease',
        permissions: ['storage', 'activeTab', 'tabs', 'scripting', 'history'],
        host_permissions: ['http://*/*', 'https://*/*'],
        icons: {
            '16': 'icon16.png',
            '32': 'icon32.png',
            '48': 'icon48.png',
            '64': 'icon64.png',
            '128': 'icon128.png',
            '512': 'icon512.png',
        },
        action: {
            default_title: 'Environment Switcher',
        },
        commands: {
            _execute_action: {
                suggested_key: { default: 'Ctrl+E', mac: 'Command+E' },
                description: 'Open Environment Switcher',
            },
        },
    },

    hooks: {
        'build:manifestGenerated': (_wxt, manifest) => {
            if (_wxt.config.browser === 'firefox') {
                (manifest as any).browser_specific_settings = {
                    gecko: {
                        id: 'env-switcher@example.com',
                        strict_min_version: '1.0.8',
                    },
                };
                if (manifest.commands?._execute_action?.suggested_key) {
                    delete (manifest.commands._execute_action.suggested_key as any).mac;
                }
            }
        },
    },

    vite: () => ({
        plugins: [tailwindcss()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        build: {
            minify: 'terser',
            terserOptions: {
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                },
            },
        },
    }),
});
