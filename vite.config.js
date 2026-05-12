import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

// package.json からバージョン情報を取得
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  // GitHub Pages のリポジトリ名に合わせてベースパスを設定
  base: '/GameWorksOAK/',
  
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  build: {
    outDir: 'dist',
    target: 'esnext',
    cssTarget: 'chrome100',
    cssMinify: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      },
    },
  },

  server: {
    port: 3000,
    open: true,
  }
});
