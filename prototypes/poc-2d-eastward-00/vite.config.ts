import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:single` embebe todo (JS + PNG) en un único index.html para la preview privada.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist', assetsInlineLimit: mode === 'single' ? Infinity : 0, chunkSizeWarningLimit: 2000 },
  server: { host: '127.0.0.1', port: 5173 },
}));
