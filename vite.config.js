import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

// Add background service worker to manifest
const manifestWithWorker = {
  ...manifest,
  background: {
    service_worker: 'service-worker-loader.js',
    type: 'module'
  },
  web_accessible_resources: [
    {
      resources: ["assets/*", "src/*"],
      matches: ["<all_urls>"]
    }
  ]
};

export default defineConfig({
  plugins: [crx({ manifest: manifestWithWorker })],
  css: {
    // Ensure CSS is properly processed
    postcss: {},
  },
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
    hmr: {
      port: 5173,
      host: 'localhost',
      protocol: 'ws',
    },
    open: false, // Don't auto-open browser for extension development
  },
  base: './', // Use relative paths for better Chrome extension compatibility
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        popup: 'src/popup/popup.html',
        loading: 'src/loading-page.js',
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          // Put CSS files next to their corresponding HTML files
          if (assetInfo.name.endsWith('.css') && assetInfo.name.includes('popup')) {
            return 'src/popup/[name].[ext]';
          }
          return 'assets/[name].[ext]';
        }
      }
    }
  }
});
