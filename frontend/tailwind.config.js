// Preset của frappe-ui + màu thương hiệu theo chuẩn UI/UX nội bộ. File này được bảo vệ.
import preset, { content } from 'frappe-ui/tailwind'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: [...content, './index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        // Màu chủ đạo #1D5FA8; tiêu đề bảng màu vàng. Chỉ dùng qua lớp fn-* trong src/standard.
        fn: {
          brand: '#1D5FA8',
          'brand-hover': '#174C86',
          'brand-soft': '#E8F0F9',
          'table-head': '#FFF2C6',
          'table-head-border': '#E8D48A',
          zebra: '#F7F9FC',
          pinned: '#F3F6FA',
          selected: '#DCE9F7',
        },
      },
    },
  },
}
