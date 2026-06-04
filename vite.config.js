import { defineConfig } from 'vite'

export default defineConfig({
  base: '/daily-card/',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash][extname]`
      }
    }
  }
})
