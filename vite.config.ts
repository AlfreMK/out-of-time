import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build can be served from any static host or subfolder.
  base: './',
  build: {
    // Three.js alone is ~600 kB minified (~170 kB gzipped); one bundle is fine for a game this size.
    chunkSizeWarningLimit: 800,
    // The minifier drops Three.js's @license header, so ship its MIT notice next to the bundle.
    license: { fileName: 'third-party-licenses.md' },
  },
});
