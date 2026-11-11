// Trạng thái luôn hiển thị bằng icon + chữ, không chỉ bằng màu.
// Màu đỏ (tone "red") chỉ dùng cho lỗi, từ chối, quá hạn.

export type StatusTone = 'blue' | 'green' | 'amber' | 'gray' | 'red' | 'violet'

export interface StatusDef {
  label: string
  /** Tên icon lucide, ví dụ "lucide-circle-check". */
  icon: string
  tone: StatusTone
}

export const TONE_CLASSES: Record<StatusTone, string> = {
  blue: 'bg-surface-blue-2 text-ink-blue-7 border-outline-blue-3',
  green: 'bg-surface-green-2 text-ink-green-7 border-outline-green-3',
  amber: 'bg-surface-amber-2 text-ink-amber-7 border-outline-amber-3',
  gray: 'bg-surface-gray-2 text-ink-gray-7 border-outline-gray-2',
  red: 'bg-surface-red-2 text-ink-red-7 border-outline-red-3',
  violet: 'bg-surface-violet-2 text-ink-violet-7 border-outline-violet-3',
}

/** Trạng thái hay dùng. Màn hình nào cần thêm thì khai báo StatusDef riêng theo cùng dạng. */
export const COMMON_STATUS = {
  active: { label: 'Đang dùng', icon: 'lucide-circle-check', tone: 'green' },
  inactive: { label: 'Ngừng dùng', icon: 'lucide-circle-pause', tone: 'gray' },
  draft: { label: 'Nháp', icon: 'lucide-file-pen', tone: 'gray' },
  pending: { label: 'Chờ duyệt', icon: 'lucide-hourglass', tone: 'amber' },
  approved: { label: 'Đã duyệt', icon: 'lucide-badge-check', tone: 'blue' },
  rejected: { label: 'Từ chối', icon: 'lucide-circle-x', tone: 'red' },
  expired: { label: 'Hết hạn', icon: 'lucide-calendar-x', tone: 'red' },
} satisfies Record<string, StatusDef>
