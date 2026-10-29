import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  resolve: {dedupe: ['react', 'react-dom']},
  root: fileURLToPath(new URL('./', import.meta.url)),
  server: {host: '127.0.0.1', port: 4177},
  preview: {host: '127.0.0.1', port: 4177},
  build: {outDir: 'dist', emptyOutDir: true},
});
