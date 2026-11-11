// Cấu hình build. File này được bảo vệ: agent không sửa.
import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import frappeui from 'frappe-ui/vite'

export default defineConfig({
  cacheDir: '.cache/vite',
  plugins: [
    frappeui({
      frontendRoute: '/contracts',
      buildConfig: {
        outDir: '../contract_tracker/public/frontend',
        baseUrl: '/assets/contract_tracker/frontend/',
        indexHtmlPath: '../contract_tracker/www/contracts.html',
      },
    }),
    vue(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
