import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { tokens, BRAND } from './design/tokens';

// PWA manifest theme colour is generated from tokens at build time (spec 05 §Brandability).
const manifestThemeColor = tokens.color.dark.bg;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // M0 ships the manifest generated from tokens. The custom injectManifest SW
      // (offline queue, precache strategy) and its update prompt land in M8 per spec 09.
      // injectRegister:false keeps the production HTML free of inline scripts so the
      // strict CSP (script-src 'self') holds without a nonce.
      strategies: 'generateSW',
      injectRegister: false,
      devOptions: { enabled: false },
      workbox: {
        // Fix #23/#26 — keep the SW precache cap sane.
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,woff2,svg,png}'],
      },
      manifest: {
        name: BRAND,
        short_name: BRAND,
        description: 'Your community, in one place.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: manifestThemeColor,
        background_color: manifestThemeColor,
        start_url: '/?source=pwa',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@design': fileURLToPath(new URL('./design', import.meta.url)),
    },
  },
  server: { port: 3005 },
  preview: { port: 3005 },
});
