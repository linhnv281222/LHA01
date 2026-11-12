// Logic của bảng danh sách chuẩn (lọc theo cột, sắp xếp, phân trang, dòng Tổng, xuất file).
// Tách khỏi DataTable.vue để test được và dùng lại được.
import type { StatusDef } from './status'
import { formatCurrency, formatDate, formatNumber } from './format'

export type ColumnType = 'text' | 'number' | 'currency' | 'date' | 'status' | 'index'

export interface Column<T = Record<string, unknown>> {
  /** Tên trường trong dữ liệu. Cột STT dùng key "_index" và type "index". */
  key: string
  /** Tiêu đề cột, tiếng Việt. Cột tiền ghi đơn vị: "Giá trị (VND)". */
  label: string
  /** Độ rộng cột (px). Bắt buộc để ghim cột và để bảng không nhảy khi đổi trang. */
  width: number
  type?: ColumnType
  align?: 'left' | 'right' | 'center'
  /** Ghim cột bên trái hoặc bên phải khi cuộn ngang. */
  pin?: 'left' | 'right'
  /** Mặc định true; cột STT luôn false. */
  sortable?: boolean
  /** Ô lọc dưới tiêu đề: "text" (mặc định), "select" (cần options) hoặc "none". */
  filter?: 'text' | 'select' | 'none'
  options?: { label: string; value: string }[]
  /** Cộng dồn ở dòng Tổng. Chỉ dùng cho cột số cùng đơn vị. */
  sum?: boolean
  /** Ẩn mặc định; người dùng bật lại được bằng nút "Cột". */
  hidden?: boolean
  /** Cột luôn hiện, không cho ẩn (ví dụ cột mã). */
  required?: boolean
  /** Lấy giá trị thô (dùng để lọc, sắp xếp, cộng). Mặc định row[key]. */
  value?: (row: T) => unknown
  /** Chuỗi hiển thị. Mặc định định dạng theo type. */
  format?: (row: T) => string
  /** Bắt buộc với type "status": trả về StatusDef của dòng. */
  status?: (row: T) => StatusDef | undefined
  /** Tiêu đề nhóm (cấp 1) khi bảng có tiêu đề 2 cấp, ví dụ "Hiệu lực" cho 2 cột Từ ngày/Đến ngày.
   *  Các cột liền nhau cùng group được gộp một ô; cột không có group chiếm cả 2 hàng tiêu đề. */
  group?: string
  /** Độ rộng nhỏ nhất khi người dùng kéo giãn (px). Mặc định 48. */
  minWidth?: number
}

export type SortState = { key: string; dir: 'asc' | 'desc' } | null

export function cellValue<T>(col: Column<T>, row: T): unknown {
  if (col.value) return col.value(row)
  return (row as Record<string, unknown>)[col.key]
}

export function cellText<T>(col: Column<T>, row: T): string {
  if (col.format) return col.format(row)
  const v = cellValue(col, row)
  if (v === null || v === undefined) return ''
  switch (col.type) {
    case 'number':
      return formatNumber(v as number)
    case 'currency':
      return formatCurrency(v as number)
    case 'date':
      return formatDate(String(v))
    case 'status':
      return col.status?.(row)?.label ?? String(v)
    default:
      return String(v)
  }
}

/** Bỏ dấu tiếng Việt và viết thường, để lọc "hop dong" khớp "Hợp đồng". */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

export function applyColumnFilters<T>(
  rows: T[],
  columns: Column<T>[],
  filters: Record<string, string>,
): T[] {
  const active = columns.filter((c) => (filters[c.key] ?? '') !== '')
  if (!active.length) return rows
  return rows.filter((row) =>
    active.every((col) => {
      const f = filters[col.key]
      if (col.filter === 'select') {
        return String(cellValue(col, row) ?? '') === f
      }
      return normalizeText(cellText(col, row)).includes(normalizeText(f))
    }),
  )
}

function compareValues(a: unknown, b: unknown): number {
  const emptyA = a === null || a === undefined || a === ''
  const emptyB = b === null || b === undefined || b === ''
  if (emptyA && emptyB) return 0
  if (emptyA) return 1
  if (emptyB) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'vi', { numeric: true, sensitivity: 'base' })
}

export function sortRows<T>(rows: T[], columns: Column<T>[], sort: SortState): T[] {
  if (!sort) return rows
  const col = columns.find((c) => c.key === sort.key)
  if (!col) return rows
  const sign = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = cellValue(col, a)
    const vb = cellValue(col, b)
    const emptyA = va === null || va === undefined || va === ''
    const emptyB = vb === null || vb === undefined || vb === ''
    // Ô trống luôn nằm cuối, dù sắp xếp tăng hay giảm.
    if (emptyA || emptyB) return compareValues(va, vb)
    return sign * compareValues(va, vb)
  })
}

/** Bấm tiêu đề: tăng dần → giảm dần → bỏ sắp xếp. */
export function nextSort(current: SortState, key: string): SortState {
  if (!current || current.key !== key) return { key, dir: 'asc' }
  if (current.dir === 'asc') return { key, dir: 'desc' }
  return null
}

export interface PageInfo {
  page: number
  pageCount: number
  from: number
  to: number
  total: number
}

export function pageInfo(total: number, page: number, pageSize: number): PageInfo {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const p = Math.min(Math.max(1, page), pageCount)
  const from = total === 0 ? 0 : (p - 1) * pageSize + 1
  const to = Math.min(total, p * pageSize)
  return { page: p, pageCount, from, to, total }
}

export function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
  const info = pageInfo(rows.length, page, pageSize)
  return rows.slice((info.page - 1) * pageSize, info.page * pageSize)
}

export function computeTotals<T>(rows: T[], columns: Column<T>[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const col of columns) {
    if (!col.sum) continue
    totals[col.key] = rows.reduce((acc, row) => {
      const v = Number(cellValue(col, row))
      return Number.isFinite(v) ? acc + v : acc
    }, 0)
  }
  return totals
}

/** Vị trí left/right (px) của các cột ghim, theo thứ tự cột đang hiện. */
export function pinOffsets<T>(columns: Column<T>[]): Record<string, { side: 'left' | 'right'; offset: number }> {
  const result: Record<string, { side: 'left' | 'right'; offset: number }> = {}
  let left = 0
  for (const col of columns) {
    if (col.pin === 'left') {
      result[col.key] = { side: 'left', offset: left }
      left += col.width
    }
  }
  let right = 0
  for (const col of [...columns].reverse()) {
    if (col.pin === 'right') {
      result[col.key] = { side: 'right', offset: right }
      right += col.width
    }
  }
  return result
}

/** Tạo nội dung CSV (UTF-8 có BOM, dấu phẩy) mở được bằng Excel, theo các cột đang hiện. */
export function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const esc = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const header = columns.map((c) => esc(c.label)).join(',')
  const lines = rows.map((row, i) =>
    columns
      .map((c) => {
        if (c.type === 'index') return String(i + 1)
        const v = cellValue(c, row)
        // Số giữ nguyên dạng số để Excel cộng được.
        if ((c.type === 'number' || c.type === 'currency') && typeof v === 'number') return String(v)
        return esc(cellText(c, row))
      })
      .join(','),
  )
  return '﻿' + [header, ...lines].join('\r\n')
}

export function downloadCsv<T>(rows: T[], columns: Column<T>[], fileName: string): void {
  const blob = new Blob([toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function formatTotal<T>(col: Column<T>, total: number | undefined): string {
  if (total === undefined) return ''
  return col.type === 'currency' ? formatCurrency(total) : formatNumber(total)
}

// ---------- Thao tác kiểu Excel: tiêu đề 2 cấp, khóa cột, co giãn cột, chiều cao dòng

export type Density = 'compact' | 'normal' | 'comfortable'
export const ROW_HEIGHT: Record<Density, number> = { compact: 32, normal: 40, comfortable: 52 }

/** Thiết lập bảng của người dùng (lưu trong trình duyệt, theo từng bảng). */
export interface TableLayout {
  widths: Record<string, number>
  hidden: string[]
  /** Khóa bên trái đến hết cột này (giống Freeze Panes của Excel). null: không khóa. undefined: theo khai báo cột. */
  leftUntil?: string | null
  /** Khóa bên phải từ cột này đến cột cuối. */
  rightFrom?: string | null
  density: Density
  wrap: boolean
  /** Kẻ ô dọc như Excel. */
  grid: boolean
}

/** Áp thiết lập của người dùng lên khai báo cột: độ rộng, ghim trái/phải theo kiểu Excel. */
export function applyLayout<T>(columns: Column<T>[], layout: Pick<TableLayout, 'widths' | 'leftUntil' | 'rightFrom'>): Column<T>[] {
  const keys = columns.map((c) => c.key)
  const declaredLeft = columns.map((c) => c.pin === 'left')
  const declaredRight = columns.map((c) => c.pin === 'right')
  let leftEnd = -1
  if (layout.leftUntil === undefined) {
    // Theo khai báo: các cột ghim trái liền nhau từ đầu.
    while (leftEnd + 1 < columns.length && declaredLeft[leftEnd + 1]) leftEnd++
  } else if (layout.leftUntil !== null) {
    leftEnd = keys.indexOf(layout.leftUntil)
  }
  let rightStart = columns.length
  if (layout.rightFrom === undefined) {
    while (rightStart - 1 > leftEnd && declaredRight[rightStart - 1]) rightStart--
  } else if (layout.rightFrom !== null) {
    const i = keys.indexOf(layout.rightFrom)
    rightStart = i < 0 ? columns.length : Math.max(i, leftEnd + 1)
  }
  return columns.map((c, i) => {
    const pin: Column<T>['pin'] = i <= leftEnd ? 'left' : i >= rightStart ? 'right' : undefined
    const w = layout.widths[c.key]
    return { ...c, pin, width: w ? Math.max(c.minWidth ?? 48, Math.round(w)) : c.width }
  })
}

export interface HeaderSegment {
  /** Nhãn ô tiêu đề cấp 1; rỗng khi là cột không có nhóm (ô chiếm 2 hàng). */
  group: string
  keys: string[]
}

/** Gộp các cột liền nhau cùng group thành ô tiêu đề cấp 1. */
export function headerSegments<T>(columns: Column<T>[]): HeaderSegment[] {
  const out: HeaderSegment[] = []
  for (const c of columns) {
    const last = out[out.length - 1]
    if (c.group && last && last.group === c.group) last.keys.push(c.key)
    else out.push({ group: c.group ?? '', keys: [c.key] })
  }
  return out
}

/** Độ rộng vừa nội dung (nhấp đúp mép tiêu đề): chữ dài nhất + lề, trong khoảng [min, 600]. */
export function autofitWidth(texts: string[], measure: (s: string) => number, min = 48, padding = 40): number {
  const widest = texts.reduce((m, s) => Math.max(m, measure(s)), 0)
  return Math.min(600, Math.max(min, Math.ceil(widest + padding)))
}

// ---------- Chọn ô, sao chép, phím tắt kiểu Excel

export interface CellPos {
  r: number
  c: number
}
export interface CellRect {
  r1: number
  c1: number
  r2: number
  c2: number
}

export function rectOf(a: CellPos, b: CellPos): CellRect {
  return { r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) }
}

export function inRect(rect: CellRect | null, r: number, c: number): boolean {
  return !!rect && r >= rect.r1 && r <= rect.r2 && c >= rect.c1 && c <= rect.c2
}

/** Giá trị của một ô khi sao chép sang Excel: số giữ dạng số thô (Excel cộng được), còn lại là chữ hiển thị. */
export function copyText<T>(col: Column<T>, row: T, index: number): string {
  if (col.type === 'index') return String(index + 1)
  const v = cellValue(col, row)
  if ((col.type === 'number' || col.type === 'currency') && typeof v === 'number') return String(v)
  return cellText(col, row).replace(/[\t\r\n]+/g, ' ')
}

/** Vùng chọn → văn bản tab/xuống dòng (dán thẳng vào Excel, Google Sheets). firstIndex: STT của dòng đầu trang. */
export function selectionToTsv<T>(rows: T[], columns: Column<T>[], rect: CellRect, withHeader = false, firstIndex = 0): string {
  const cols = columns.slice(rect.c1, rect.c2 + 1)
  const lines: string[] = []
  if (withHeader) lines.push(cols.map((c) => (c.group ? `${c.group} - ${c.label}` : c.label)).join('\t'))
  for (let r = rect.r1; r <= rect.r2 && r < rows.length; r++) {
    lines.push(cols.map((c) => copyText(c, rows[r], firstIndex + r)).join('\t'))
  }
  return lines.join('\r\n')
}

/** Di chuyển ô đang chọn theo phím (mũi tên, Home/End, Ctrl+Home/End, Tab). Trả về vị trí mới trong giới hạn bảng. */
export function moveCell(pos: CellPos, key: string, rows: number, cols: number, ctrl = false): CellPos {
  let { r, c } = pos
  switch (key) {
    case 'ArrowUp':
      r = ctrl ? 0 : r - 1
      break
    case 'ArrowDown':
      r = ctrl ? rows - 1 : r + 1
      break
    case 'ArrowLeft':
      c = ctrl ? 0 : c - 1
      break
    case 'ArrowRight':
    case 'Tab':
      c = ctrl ? cols - 1 : c + 1
      break
    case 'Home':
      c = 0
      if (ctrl) r = 0
      break
    case 'End':
      c = cols - 1
      if (ctrl) r = rows - 1
      break
  }
  return { r: Math.min(Math.max(0, r), Math.max(0, rows - 1)), c: Math.min(Math.max(0, c), Math.max(0, cols - 1)) }
}
