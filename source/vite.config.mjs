import { defineConfig, transformWithEsbuild } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig(({ command }) => ({
  base: './',
  publicDir: false,
  plugins: [{
    name: 'legacy-jsx-files', enforce: 'pre',
    transform(code, id) {
      if (id.startsWith(resolve(root, 'src') + '/') && /\.js$/.test(id)) {
        return transformWithEsbuild(code, id, {loader:'jsx',jsx:'transform',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'});
      }
    },
  }],
  define: {
    'process.env.NODE_ENV': JSON.stringify(command === 'build' ? 'production' : 'development'),
    'process.env.PUBLIC_URL': JSON.stringify('.'),
    global: 'globalThis',
  },
  esbuild: { jsx:'transform', legalComments:'eof', charset:'ascii' },
  build: {
    outDir:'build', emptyOutDir:true, target:'es2018', cssCodeSplit:false,
    minify:'esbuild', sourcemap:false, modulePreload:false, assetsInlineLimit:4096,
    rollupOptions: {
      input:resolve(root,'src/index.js'),
      output: {
        format:'iife', name:'VideoWhisperClient', inlineDynamicImports:true,
        entryFileNames:'static/js/main.[hash].chunk.js',
        assetFileNames:asset => asset.names?.some(name=>name.endsWith('.css')) ? 'static/css/main.[hash].chunk.css' : 'static/media/[name].[hash][extname]',
      },
    },
  },
  server:{host:'127.0.0.1',port:3000,strictPort:true},
}));
