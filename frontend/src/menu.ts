// Menu chính của ứng dụng. Màn hình mới thêm một mục vào đây.
// Quy tắc (có test kiểm tra): tối đa 9 mục cấp 1, tối đa 3 cấp; mục cha dùng children.
import type { MenuItem } from '@/standard'

export const MENU: MenuItem[] = [
  { label: 'Loại hợp đồng', route: '/contract-types', icon: 'lucide-tags' },
]
