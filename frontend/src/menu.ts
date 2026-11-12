// Menu chính của ứng dụng. Màn hình mới thêm một mục vào đây.
// Quy tắc (có test kiểm tra): tối đa 9 mục cấp 1, tối đa 3 cấp; mục cha dùng children.
import type { MenuItem } from '@/standard'

export const MENU: MenuItem[] = [
  { label: 'Hợp đồng', route: '/contracts', icon: 'lucide-file-text' },
  { label: 'Lịch thu tiền', route: '/payment-schedules', icon: 'lucide-calendar-clock' },
  { label: 'Đề nghị thanh toán', route: '/payment-requests', icon: 'lucide-file-check', group: 'Chứng từ' },
  { label: 'Nghiệm thu', route: '/acceptance-minutes', icon: 'lucide-file-signature', group: 'Chứng từ' },
  { label: 'Hóa đơn', route: '/invoices', icon: 'lucide-receipt-text', group: 'Chứng từ' },
  { label: 'Phiếu thu', route: '/receipts', icon: 'lucide-wallet', group: 'Chứng từ' },
  {
    label: 'Danh mục',
    group: 'Thiết lập',
    icon: 'lucide-folder',
    children: [
      { label: 'Loại hợp đồng', route: '/contract-types', icon: 'lucide-tags' },
      { label: 'Thuế suất', route: '/vat-rates', icon: 'lucide-percent' },
      { label: 'Khách hàng', route: '/customers', icon: 'lucide-building-2' },
    ],
  },
]
