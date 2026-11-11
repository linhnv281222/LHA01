// Menu chính của ứng dụng. Màn hình mới thêm một mục vào đây.
// Quy tắc (có test kiểm tra): tối đa 9 mục cấp 1, tối đa 3 cấp; mục cha dùng children.
import type { MenuItem } from '@/standard'

export const MENU: MenuItem[] = [
  { label: 'Lịch thu tiền', route: '/payment-schedules', icon: 'lucide-calendar-clock' },
  { label: 'Hợp đồng', route: '/contracts', icon: 'lucide-file-text' },
  { label: 'Hóa đơn', route: '/invoices', icon: 'lucide-receipt-text' },
  { label: 'Phiếu thu', route: '/receipts', icon: 'lucide-wallet' },
  {
    label: 'Danh mục',
    icon: 'lucide-folder',
    children: [
      { label: 'Loại hợp đồng', route: '/contract-types', icon: 'lucide-tags' },
      { label: 'Thuế suất', route: '/vat-rates', icon: 'lucide-percent' },
      { label: 'Khách hàng', route: '/customers', icon: 'lucide-building-2' },
    ],
  },
]
