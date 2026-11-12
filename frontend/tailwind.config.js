// Preset của frappe-ui + màu thương hiệu theo chuẩn UI/UX nội bộ. File này được bảo vệ.
import preset, { content } from 'frappe-ui/tailwind'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: [...content, './index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        // Màu chủ đạo #1D5FA8; tiêu đề bảng xám nhạt, chỉ kẻ ngang. Chỉ dùng qua lớp fn-* trong src/standard.
        fn: {
          brand: '#1D5FA8',
          'brand-hover': '#174C86',
          'brand-soft': '#E8F0F9',
          'table-head': '#F6F7F9',
          'table-head-border': '#E4E7EB',
          zebra: '#FAFBFC',
          pinned: '#FFFFFF',
          selected: '#EDF4FC',
          line: '#EEF0F3',
        },
      },
    },
  },
}
