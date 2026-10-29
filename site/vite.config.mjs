import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{dedupe:['react','react-dom']},root:fileURLToPath(new URL('./',import.meta.url)),base:process.env.SITE_BASE??'/relive/',build:{outDir:'dist',emptyOutDir:true},server:{host:'127.0.0.1',port:4176},preview:{host:'127.0.0.1',port:4176}});
