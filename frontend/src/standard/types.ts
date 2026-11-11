import type { StatusDef } from './status'

export interface StatCard {
  key: string
  label: string
  value: string | number
  /** Có status thì thẻ bấm được để lọc theo trạng thái đó. */
  status?: StatusDef
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
