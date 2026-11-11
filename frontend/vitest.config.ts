// Cấu hình test. Không dùng plugin frappe-ui ở đây (không cần bench khi chạy test).
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  cacheDir: '.cache/vite',
  plugins: [vue()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    server: { deps: { inline: ['frappe-ui'] } },
  },
})
