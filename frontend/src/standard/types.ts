import type { StatusDef } from './status'

export interface StatCard {
  key: string
  label: string
  value: string | number
  /** Có status thì thẻ bấm được để lọc theo trạng thái đó. */
  status?: StatusDef
  /** Màu của con số: green = tốt (đã thu), amber = cần chú ý (còn phải thu), red = quá hạn/lỗi. */
  tone?: 'green' | 'amber' | 'red' | 'blue'
  /** Dòng phụ dưới con số, ví dụ "3 đợt quá hạn · 214.000.000". */
  hint?: string
  /** Thanh tiến độ 0-100 dưới con số (ví dụ % đã thu). */
  progress?: number
}

/** Cột của LineItems (bảng nhập nhiều dòng trong form). */
export interface LineColumn {
  key: string
  label: string
  /** Độ rộng trong lưới CSS, ví dụ "160px", "minmax(180px,2fr)". Mặc định chia đều phần còn lại. */
  width?: string
  align?: 'left' | 'right' | 'center'
  required?: boolean
  /** Cột tự tính, chỉ hiển thị chữ (không phải ô nhập). */
  readonly?: boolean
}

export interface DetailField {
  label: string
  value: string | number | null | undefined
  /** Chiếm cả hàng (mô tả dài). */
  wide?: boolean
}

export interface SelectOption {
  label: string
  value: string
}

/** Các hàm DataTable cho trang gọi qua ref: const table = ref<DataTableExpose | null>(null). */
export interface DataTableExpose {
  /** Xuất dữ liệu đã lọc và sắp xếp (mọi trang), theo các cột đang hiện. */
  exportExcel(fileName: string): void
  clearColumnFilters(): void
}
