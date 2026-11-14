<script setup lang="ts" generic="T extends Record<string, any>">
// Bảng danh sách chuẩn, thao tác gần với Excel:
// - tiêu đề xám nhạt, chỉ kẻ ngang (bật "Kẻ ô dọc" trong nút Cột), hàng lọc ngay dưới, bấm tiêu đề để sắp xếp
// - tiêu đề 2 cấp: cột khai báo group (ví dụ "Hiệu lực") được gộp ô tiêu đề cấp 1
// - kéo mép phải tiêu đề để giãn/thu cột, nhấp đúp mép = vừa nội dung; Tab tới mép rồi phím ←/→ cũng giãn được
// - menu ⋮ ở tiêu đề: sắp xếp, khóa các cột đến cột này (bên trái), khóa từ cột này sang phải, bỏ khóa, vừa nội dung, ẩn cột
// - nút Cột: ẩn/hiện cột, chiều cao dòng (gọn/vừa/rộng), xuống dòng khi chữ dài, kẻ ô dọc, khôi phục mặc định
// - thiết lập (độ rộng, khóa, cột ẩn, chiều cao dòng) lưu trong trình duyệt theo từng bảng, từng người
// - 20 dòng/trang (16 với bảng tiêu đề 2 cấp), chọn 20/50/100, ô "Đến trang", "(a-b / tổng)"
// - dòng chẵn lẻ khác màu, dòng Tổng dính đáy, tính trên toàn bộ dữ liệu đã lọc
// - trống: "Không có dữ liệu khớp bộ lọc" + "Xóa bộ lọc"; bấm dòng để chọn (hiện chi tiết bên dưới)
// - ô nhiều dòng (ví dụ tên + mô tả) đặt qua slot cell-<key>; dòng tự cao theo nội dung
// - chọn ô như Excel: bấm ô, Shift+bấm hoặc kéo chuột để chọn vùng; Ctrl+C sao chép (dán thẳng vào Excel),
//   Ctrl+Shift+C sao chép kèm tiêu đề, Ctrl+A chọn cả trang; mũi tên/Tab/Home/End (kèm Ctrl) di chuyển,
//   Shift+mũi tên mở rộng vùng; PageUp/PageDown đổi trang; Enter mở chi tiết dòng; Esc bỏ vùng chọn
import { computed, ref, watch } from 'vue'
import { Button, Dropdown, LoadingIndicator, Popover, toast } from 'frappe-ui'
import StatusBadge from './StatusBadge.vue'
import {
  applyColumnFilters,
  applyLayout,
  autofitWidth,
  cellText,
  computeTotals,
  downloadCsv,
  formatTotal,
  headerSegments,
  inRect,
  moveCell,
  rectOf,
  selectionToTsv,
  nextSort,
  pageInfo,
  paginate,
  pinOffsets,
  ROW_HEIGHT,
  sortRows,
  type Column,
  type Density,
  type CellPos,
  type HeaderSegment,
  type SortState,
  type TableLayout,
} from './table'

const props = withDefaults(
  defineProps<{
    columns: Column<T>[]
    rows: T[]
    rowKey?: string
    loading?: boolean
    /** 1: tiêu đề một cấp (20 dòng/trang); 2: tiêu đề hai cấp (16 dòng/trang). Có cột khai báo group thì tự là 2. */
    headerLevel?: 1 | 2
    pageSizes?: number[]
    /** Chiều cao tối đa vùng bảng. Mặc định để màn 1900x887 hiện 11-12 dòng. */
    maxHeight?: string
    /** Có bộ lọc ngoài bảng (panel trái) đang bật, để hiện link "Xóa bộ lọc" khi trống. */
    externalFilterActive?: boolean
    caption?: string
    /** Khóa lưu thiết lập bảng trong trình duyệt. Mặc định theo đường dẫn trang và danh sách cột. */
    storageKey?: string
  }>(),
  {
    rowKey: 'name',
    loading: false,
    headerLevel: 1,
    pageSizes: () => [20, 50, 100],
    maxHeight: 'max(320px, calc(100vh - 330px))',
    externalFilterActive: false,
    caption: '',
    storageKey: '',
  },
)

const selected = defineModel<string | null>('selected', { default: null })
const emit = defineEmits<{ 'clear-filters': [] }>()

// ---------- thiết lập của người dùng (lưu trong trình duyệt)
const storeKey = computed(
  () => props.storageKey || `fn-table:${typeof location === 'undefined' ? '' : location.pathname}:${props.columns.map((c) => c.key).join(',')}`,
)
function defaultLayout(): TableLayout {
  return {
    widths: {},
    hidden: props.columns.filter((c) => c.hidden).map((c) => c.key),
    leftUntil: undefined,
    rightFrom: undefined,
    density: 'normal',
    wrap: false,
    grid: false,
  }
}
function loadLayout(): TableLayout {
  try {
    const raw = localStorage.getItem(storeKey.value)
    if (raw) return { ...defaultLayout(), ...JSON.parse(raw) }
  } catch {
    /* trình duyệt chặn lưu trữ: dùng mặc định */
  }
  return defaultLayout()
}
const layout = ref<TableLayout>(loadLayout())
watch(
  layout,
  (v) => {
    try {
      localStorage.setItem(storeKey.value, JSON.stringify(v))
    } catch {
      /* bỏ qua */
    }
  },
  { deep: true },
)
function resetLayout() {
  layout.value = defaultLayout()
  try {
    localStorage.removeItem(storeKey.value)
  } catch {
    /* bỏ qua */
  }
}

const columnFilters = ref<Record<string, string>>({})
const sort = ref<SortState>(null)
const hasGroups = computed(() => props.columns.some((c) => c.group))
const level = computed(() => (props.headerLevel === 2 || hasGroups.value ? 2 : 1))
const pageSize = ref(level.value === 2 ? 16 : 20)
const page = ref(1)
const gotoText = ref('')
const hiddenKeys = computed(() => new Set(layout.value.hidden))

const sizeOptions = computed(() => {
  const base = level.value === 2 ? [16, ...props.pageSizes.filter((n) => n !== 20)] : props.pageSizes
  return Array.from(new Set(base)).sort((a, b) => a - b)
})

const visibleColumns = computed(() =>
  applyLayout(
    props.columns.filter((c) => !hiddenKeys.value.has(c.key)),
    layout.value,
  ),
)
const offsets = computed(() => pinOffsets(visibleColumns.value))
const lastLeftPinned = computed(() => {
  const left = visibleColumns.value.filter((c) => c.pin === 'left')
  return left.length ? left[left.length - 1].key : null
})
const firstRightPinned = computed(() => visibleColumns.value.find((c) => c.pin === 'right')?.key ?? null)
const anyPinned = computed(() => visibleColumns.value.some((c) => c.pin))
const tableWidth = computed(() => visibleColumns.value.reduce((s, c) => s + c.width, 0))
const segments = computed(() => headerSegments(visibleColumns.value))
const colByKey = computed(() => Object.fromEntries(visibleColumns.value.map((c) => [c.key, c])))

// Vị trí dính của các hàng tiêu đề: [hàng nhóm] → hàng nhãn → hàng lọc.
const GROUP_H = 30
const LABEL_H = 36
const labelTop = computed(() => (hasGroups.value ? GROUP_H : 0))
const filterTop = computed(() => labelTop.value + LABEL_H)

const filtered = computed(() => applyColumnFilters(props.rows, props.columns, columnFilters.value))
const sorted = computed(() => sortRows(filtered.value, props.columns, sort.value))
const info = computed(() => pageInfo(sorted.value.length, page.value, pageSize.value))
const pageRows = computed(() => paginate(sorted.value, info.value.page, pageSize.value))
const totals = computed(() => computeTotals(filtered.value, props.columns))
const hasTotals = computed(() => props.columns.some((c) => c.sum))
const anyFilter = computed(
  () => props.externalFilterActive || Object.values(columnFilters.value).some((v) => v !== ''),
)

watch([() => props.rows, columnFilters, pageSize], () => (page.value = 1), { deep: true })

function keyOf(row: T): string {
  return String(row[props.rowKey])
}

function canSort(col: Column<T>) {
  return col.sortable !== false && col.type !== 'index'
}
function toggleSort(col: Column<T>) {
  if (!canSort(col)) return
  sort.value = nextSort(sort.value, col.key)
}

function ariaSort(col: Column<T>): 'ascending' | 'descending' | 'none' {
  if (sort.value?.key !== col.key) return 'none'
  return sort.value.dir === 'asc' ? 'ascending' : 'descending'
}

function toggleColumn(key: string) {
  const next = new Set(layout.value.hidden)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  layout.value.hidden = [...next]
}

function setDensity(d: Density) {
  layout.value.density = d
}

// ---------- co giãn cột (kéo mép phải tiêu đề)
let drag: { key: string; startX: number; startW: number; min: number } | null = null
const resizing = ref<string | null>(null)
function setWidth(key: string, w: number) {
  const col = props.columns.find((c) => c.key === key)
  layout.value.widths = { ...layout.value.widths, [key]: Math.max(col?.minWidth ?? 48, Math.round(w)) }
}
function onResizeStart(e: PointerEvent, col: Column<T>) {
  e.preventDefault()
  e.stopPropagation()
  drag = { key: col.key, startX: e.clientX, startW: col.width, min: col.minWidth ?? 48 }
  resizing.value = col.key
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', onResizeEnd, { once: true })
}
function onResizeMove(e: PointerEvent) {
  if (!drag) return
  setWidth(drag.key, Math.max(drag.min, drag.startW + e.clientX - drag.startX))
}
function onResizeEnd() {
  drag = null
  resizing.value = null
  window.removeEventListener('pointermove', onResizeMove)
}
function onResizeKey(e: KeyboardEvent, col: Column<T>) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    setWidth(col.key, col.width + (e.key === 'ArrowRight' ? 16 : -16))
  } else if (e.key === 'Enter') {
    e.preventDefault()
    autofit(col)
  }
}

let ctx: CanvasRenderingContext2D | null = null
function measure(text: string, bold = false): number {
  if (!ctx) ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return text.length * 8
  const family = getComputedStyle(document.body).fontFamily || 'sans-serif'
  ctx.font = `${bold ? 600 : 400} 14px ${family}`
  return ctx.measureText(text).width
}
/** Vừa nội dung: chữ dài nhất của tiêu đề và các dòng đã lọc (tối đa 500 dòng). */
function autofit(col: Column<T>) {
  const texts = filtered.value.slice(0, 500).map((r) => cellText(col, r))
  const body = autofitWidth(texts, (s) => measure(s), col.minWidth ?? 48, col.type === 'status' ? 56 : 28)
  const head = autofitWidth([col.label], (s) => measure(s, true), col.minWidth ?? 48, 64)
  setWidth(col.key, Math.max(body, head))
}

// ---------- menu ⋮ của tiêu đề cột
function columnMenu(col: Column<T>) {
  const groups: any[] = []
  if (canSort(col)) {
    groups.push({
      group: 'Sắp xếp',
      hideLabel: true,
      options: [
        { label: 'Sắp xếp tăng dần', icon: 'lucide-arrow-up-narrow-wide', onClick: () => (sort.value = { key: col.key, dir: 'asc' }) },
        { label: 'Sắp xếp giảm dần', icon: 'lucide-arrow-down-wide-narrow', onClick: () => (sort.value = { key: col.key, dir: 'desc' }) },
      ],
    })
  }
  const pin: any[] = [
    { label: 'Khóa các cột đến cột này', icon: 'lucide-panel-left', onClick: () => (layout.value.leftUntil = col.key) },
    { label: 'Khóa từ cột này sang phải', icon: 'lucide-panel-right', onClick: () => (layout.value.rightFrom = col.key) },
  ]
  if (anyPinned.value) {
    pin.push({
      label: 'Bỏ khóa tất cả cột',
      icon: 'lucide-lock-open',
      onClick: () => {
        layout.value.leftUntil = null
        layout.value.rightFrom = null
      },
    })
  }
  groups.push({ group: 'Khóa cột', hideLabel: true, options: pin })
  const other: any[] = [{ label: 'Vừa nội dung', icon: 'lucide-move-horizontal', onClick: () => autofit(col) }]
  if (!col.required && col.type !== 'index') {
    other.push({ label: 'Ẩn cột', icon: 'lucide-eye-off', onClick: () => toggleColumn(col.key) })
  }
  groups.push({ group: 'Khác', hideLabel: true, options: other })
  return groups
}

function clearFilters() {
  columnFilters.value = {}
  emit('clear-filters')
}

function goTo() {
  const n = Number.parseInt(gotoText.value, 10)
  if (Number.isFinite(n)) page.value = Math.min(Math.max(1, n), info.value.pageCount)
  gotoText.value = ''
}

function selectRow(row: T) {
  selected.value = keyOf(row)
}

// ---------- chọn ô, sao chép, phím tắt
const gridEl = ref<HTMLElement | null>(null)
const anchor = ref<CellPos | null>(null)
const focus = ref<CellPos | null>(null)
const rect = computed(() => (anchor.value && focus.value ? rectOf(anchor.value, focus.value) : null))
const rectSize = computed(() => (rect.value ? (rect.value.r2 - rect.value.r1 + 1) * (rect.value.c2 - rect.value.c1 + 1) : 0))
let dragging = false
watch([pageRows, visibleColumns], () => {
  anchor.value = null
  focus.value = null
})

function isEditable(el: EventTarget | null) {
  return el instanceof HTMLElement && !!el.closest('input, select, textarea, button, a, [role="separator"], [contenteditable="true"]')
}
function onCellDown(e: MouseEvent, r: number, c: number) {
  if (e.button !== 0 || isEditable(e.target)) return
  const pos = { r, c }
  // Như Excel: kéo chuột là chọn vùng ô, không bôi đen chữ.
  e.preventDefault()
  if (e.shiftKey && anchor.value) {
    focus.value = pos
  } else {
    anchor.value = pos
    focus.value = pos
  }
  dragging = true
  window.addEventListener('mouseup', () => (dragging = false), { once: true })
  gridEl.value?.focus({ preventScroll: true })
}
function onCellEnter(r: number, c: number) {
  if (dragging && anchor.value) focus.value = { r, c }
}
function scrollToFocus() {
  const f = focus.value
  if (!f) return
  requestAnimationFrame(() => {
    gridEl.value?.querySelector<HTMLElement>(`[data-cell="${f.r}-${f.c}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
}
async function copySelection(withHeader: boolean) {
  if (!rect.value) return
  const text = selectionToTsv(pageRows.value, visibleColumns.value, rect.value, withHeader, info.value.from - 1)
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Trình duyệt chặn Clipboard API (trang http): dùng cách cũ.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
    gridEl.value?.focus({ preventScroll: true })
  }
  toast.success(`Đã sao chép ${rectSize.value} ô${withHeader ? ' kèm tiêu đề' : ''}. Dán vào Excel bằng Ctrl+V.`)
}
function onGridKey(e: KeyboardEvent) {
  if (isEditable(e.target)) return
  const rows = pageRows.value.length
  const cols = visibleColumns.value.length
  if (!rows || !cols) return
  const mod = e.ctrlKey || e.metaKey
  const k = e.key
  if (mod && (k === 'c' || k === 'C')) {
    if (!rect.value) return
    e.preventDefault()
    void copySelection(e.shiftKey)
    return
  }
  if (mod && (k === 'a' || k === 'A')) {
    e.preventDefault()
    anchor.value = { r: 0, c: 0 }
    focus.value = { r: rows - 1, c: cols - 1 }
    return
  }
  if (k === 'Escape') {
    if (focus.value) anchor.value = { ...focus.value }
    return
  }
  if (k === 'PageDown' || k === 'PageUp') {
    e.preventDefault()
    page.value = Math.min(Math.max(1, info.value.page + (k === 'PageDown' ? 1 : -1)), info.value.pageCount)
    return
  }
  if (k === 'Enter') {
    const f = focus.value
    if (f && pageRows.value[f.r]) {
      e.preventDefault()
      selectRow(pageRows.value[f.r])
    }
    return
  }
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'].includes(k)) return
  if (k === 'Tab' && (e.shiftKey || !focus.value)) return
  e.preventDefault()
  const from = focus.value ?? { r: 0, c: 0 }
  const next = focus.value ? moveCell(from, k, rows, cols, mod) : from
  focus.value = next
  if (!e.shiftKey || !anchor.value) anchor.value = { ...next }
  scrollToFocus()
}

function pinStyle(col: Column<T>, extra: Record<string, string> = {}) {
  const style: Record<string, string> = { width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px`, ...extra }
  const p = offsets.value[col.key]
  if (p) style[p.side] = `${p.offset}px`
  return style
}

// Màu tiêu đề theo nhóm cột: mỗi nhóm (group) một tông, lần lượt xanh dương, xanh ngọc, hổ phách, tím; cột không
// nhóm dùng tông xám. Hàng nhóm đậm hơn hàng tên cột; hàng tên cột có gạch chân cùng tông để thấy ranh giới nhóm.
const GROUP_TONES = [
  { g: '#D6E4F5', h: '#EBF2FB', a: '#1D5FA8', t: '#123E70' },
  { g: '#D3ECE6', h: '#EAF6F3', a: '#0F766E', t: '#0B4F4A' },
  { g: '#F6E3C0', h: '#FCF3E2', a: '#B45309', t: '#7A3A06' },
  { g: '#E3DBF5', h: '#F2EEFB', a: '#6D4CC2', t: '#45307F' },
]
const NEUTRAL_TONE = { g: '#E6EAF0', h: '#EEF1F5', a: '#94A3B8', t: '#1F2937' }
const toneByGroup = computed(() => {
  const map: Record<string, (typeof GROUP_TONES)[number]> = {}
  for (const c of visibleColumns.value) {
    if (c.group && !map[c.group]) map[c.group] = GROUP_TONES[Object.keys(map).length % GROUP_TONES.length]
  }
  return map
})
function headVars(group?: string): Record<string, string> {
  const t = (group && toneByGroup.value[group]) || NEUTRAL_TONE
  return { '--fn-gh': t.g, '--fn-ch': t.h, '--fn-ca': t.a, '--fn-ct': t.t }
}

function groupStyle(seg: HeaderSegment) {
  const cols = seg.keys.map((k) => colByKey.value[k])
  const width = cols.reduce((s, c) => s + c.width, 0)
  const style: Record<string, string> = { width: `${width}px`, minWidth: `${width}px`, top: '0px', ...headVars(seg.group) }
  const sides = new Set(cols.map((c) => c.pin ?? ''))
  if (sides.size === 1 && cols[0].pin) {
    const side = cols[0].pin
    const anchor = side === 'left' ? cols[0] : cols[cols.length - 1]
    style[side] = `${offsets.value[anchor.key].offset}px`
    style.zIndex = '5'
  }
  return style
}

function alignClass(col: Column<T>) {
  return col.align === 'right' || col.type === 'number' || col.type === 'currency'
    ? 'text-right tabular-nums'
    : col.align === 'center' || col.type === 'index'
      ? 'text-center tabular-nums'
      : 'text-left'
}

function cellClasses(col: Column<T>) {
  return [
    offsets.value[col.key] ? 'fn-pinned' : '',
    col.key === lastLeftPinned.value ? 'fn-pin-edge-left' : '',
    col.key === firstRightPinned.value ? 'fn-pin-edge-right' : '',
    alignClass(col),
  ]
}

/** Dữ liệu đã lọc và sắp xếp (mọi trang), theo các cột đang hiện. Dùng cho nút Xuất Excel. */
function exportExcel(fileName: string) {
  downloadCsv(sorted.value, visibleColumns.value, fileName)
}

defineExpose({ exportExcel, filteredRows: sorted, clearColumnFilters: () => (columnFilters.value = {}), resetLayout })

const DENSITIES: { value: Density; label: string }[] = [
  { value: 'compact', label: 'Gọn' },
  { value: 'normal', label: 'Vừa' },
  { value: 'comfortable', label: 'Rộng' },
]
</script>

<template>
  <div class="fn-table overflow-hidden rounded-6 border border-outline-gray-2 bg-surface-base" :class="resizing ? 'select-none' : ''">
    <div class="flex items-center justify-between gap-2 border-b border-outline-gray-1 px-3 py-1.5">
      <span class="text-sm text-ink-gray-6">{{ caption }}</span>
      <Popover>
        <template #trigger>
          <Button size="sm" variant="ghost" icon-left="lucide-columns-3" label="Cột" aria-label="Ẩn hoặc hiện cột, chiều cao dòng" />
        </template>
        <div class="w-72 space-y-1 rounded-6 bg-surface-elevation-2 p-2 shadow-2xl">
          <p class="px-1 pb-1 text-sm text-ink-gray-5">Chọn cột hiển thị</p>
          <div class="max-h-64 overflow-y-auto">
            <label
              v-for="col in columns"
              :key="col.key"
              class="flex min-h-7 cursor-pointer items-center gap-2 rounded-4 px-1 text-base text-ink-gray-8 hover:bg-surface-gray-2"
              :class="col.required || col.type === 'index' ? 'cursor-not-allowed opacity-60' : ''"
            >
              <input
                type="checkbox"
                class="size-4 accent-[#1D5FA8]"
                :checked="!hiddenKeys.has(col.key)"
                :disabled="col.required || col.type === 'index'"
                @change="toggleColumn(col.key)"
              />
              {{ col.group ? `${col.group} · ${col.label}` : col.label }}
            </label>
          </div>
          <div class="border-t border-outline-gray-1 px-1 pt-2">
            <p class="pb-1 text-sm text-ink-gray-5">Chiều cao dòng</p>
            <div class="flex gap-1" role="radiogroup" aria-label="Chiều cao dòng">
              <button
                v-for="d in DENSITIES"
                :key="d.value"
                type="button"
                role="radio"
                :aria-checked="layout.density === d.value"
                class="h-7 flex-1 rounded-4 border text-sm"
                :class="layout.density === d.value ? 'border-fn-brand bg-fn-brand-soft font-semibold text-fn-brand' : 'border-outline-gray-2 text-ink-gray-7 hover:bg-surface-gray-2'"
                @click="setDensity(d.value)"
              >
                {{ d.label }}
              </button>
            </div>
            <label class="mt-2 flex min-h-7 cursor-pointer items-center gap-2 text-base text-ink-gray-8">
              <input v-model="layout.wrap" type="checkbox" class="size-4 accent-[#1D5FA8]" /> Xuống dòng khi chữ dài
            </label>
            <label class="flex min-h-7 cursor-pointer items-center gap-2 text-base text-ink-gray-8">
              <input v-model="layout.grid" type="checkbox" class="size-4 accent-[#1D5FA8]" /> Kẻ ô dọc
            </label>
          </div>
          <div class="border-t border-outline-gray-1 px-1 pt-2 text-sm text-ink-gray-5">
            Kéo mép phải tiêu đề để giãn cột, nhấp đúp để vừa nội dung. Khóa cột: menu ⋮ ở tiêu đề.
            <span class="mt-1 block">Phím tắt: bấm ô rồi Shift+bấm hoặc kéo để chọn vùng · Ctrl+C sao chép · Ctrl+Shift+C kèm tiêu đề ·
            Ctrl+A chọn cả trang · mũi tên, Tab, Home/End (kèm Ctrl) · Shift+mũi tên mở rộng · PageUp/PageDown đổi trang · Enter xem chi tiết · Esc bỏ chọn.</span>
          </div>
          <Button size="sm" variant="subtle" class="w-full" icon-left="lucide-rotate-ccw" label="Khôi phục mặc định" @click="resetLayout" />
        </div>
      </Popover>
    </div>

    <div
      ref="gridEl"
      class="fn-grid-scroll relative overflow-auto"
      :style="{ maxHeight }"
      tabindex="0"
      role="grid"
      :aria-label="caption || 'Bảng dữ liệu'"
      aria-multiselectable="true"
      @keydown="onGridKey"
    >
      <table
        class="border-separate border-spacing-0 text-base"
        :class="[layout.wrap ? 'fn-wrap' : '', layout.grid ? 'fn-grid' : '']"
        :style="{ width: `${tableWidth}px`, minWidth: '100%', '--fn-row-h': `${ROW_HEIGHT[layout.density]}px` }"
      >
        <thead>
          <tr v-if="hasGroups" class="fn-group-row">
            <template v-for="(seg, si) in segments" :key="si">
              <th
                v-if="seg.group"
                :colspan="seg.keys.length"
                scope="colgroup"
                class="fn-th-group"
                :style="groupStyle(seg)"
              >
                {{ seg.group }}
              </th>
              <th
                v-for="k in seg.group ? [] : seg.keys"
                :key="k"
                class="fn-th-group fn-th-group-empty"
                :class="cellClasses(colByKey[k])"
                :style="pinStyle(colByKey[k], { top: '0px', ...headVars() })"
                aria-hidden="true"
              />
            </template>
          </tr>
          <tr class="fn-head-row">
            <th
              v-for="col in visibleColumns"
              :key="col.key"
              scope="col"
              class="fn-th group/th"
              :class="cellClasses(col)"
              :style="pinStyle(col, { top: `${labelTop}px`, ...headVars(col.group) })"
              :aria-sort="ariaSort(col)"
            >
              <div class="flex items-center gap-0.5" :class="alignClass(col) === 'text-right tabular-nums' ? 'flex-row-reverse' : ''">
                <button
                  v-if="canSort(col)"
                  type="button"
                  class="fn-th-label inline-flex min-w-0 flex-1 items-center gap-1 text-sm-semibold"
                  :class="alignClass(col) === 'text-right tabular-nums' ? 'justify-end' : ''"
                  :title="col.label"
                  @click="toggleSort(col)"
                >
                  <span class="truncate">{{ col.label }}</span>
                  <span
                    class="size-3.5 shrink-0"
                    :class="
                      sort?.key === col.key
                        ? sort.dir === 'asc'
                          ? 'lucide-arrow-up text-fn-brand'
                          : 'lucide-arrow-down text-fn-brand'
                        : 'lucide-arrow-up-down opacity-40'
                    "
                    aria-hidden="true"
                  />
                </button>
                <span v-else class="fn-th-label min-w-0 flex-1 truncate text-sm-semibold" :class="alignClass(col)">{{ col.label }}</span>
                <Dropdown v-if="col.type !== 'index'" :options="columnMenu(col)">
                  <button
                    type="button"
                    class="fn-col-menu flex size-6 items-center justify-center rounded-4 border border-outline-gray-2 text-ink-gray-6 hover:text-ink-gray-9"
                    :aria-label="`Tùy chọn cột ${col.label}`"
                    :title="`Tùy chọn cột ${col.label}`"
                  >
                    <span class="lucide-ellipsis-vertical size-3.5" aria-hidden="true" />
                  </button>
                </Dropdown>
              </div>
              <span
                class="fn-resize"
                :class="resizing === col.key ? 'fn-resize-active' : ''"
                role="separator"
                aria-orientation="vertical"
                tabindex="0"
                :aria-label="`Độ rộng cột ${col.label}: ${col.width}px. Phím mũi tên trái/phải để giãn, Enter để vừa nội dung`"
                :aria-valuenow="col.width"
                title="Kéo để giãn cột, nhấp đúp để vừa nội dung"
                @pointerdown="onResizeStart($event, col)"
                @dblclick.stop="autofit(col)"
                @keydown="onResizeKey($event, col)"
                @click.stop
              />
            </th>
          </tr>
          <tr class="fn-filter-row">
            <th
              v-for="col in visibleColumns"
              :key="col.key"
              class="fn-th-filter"
              :class="cellClasses(col)"
              :style="pinStyle(col, { top: `${filterTop}px`, ...headVars(col.group) })"
            >
              <select
                v-if="col.filter === 'select'"
                v-model="columnFilters[col.key]"
                class="fn-filter-input"
                :aria-label="`Lọc theo ${col.label}`"
              >
                <option value="">Tất cả</option>
                <option v-for="o in col.options ?? []" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <input
                v-else-if="col.filter !== 'none' && col.type !== 'index'"
                v-model="columnFilters[col.key]"
                type="search"
                class="fn-filter-input"
                :aria-label="`Lọc theo ${col.label}`"
              />
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, i) in pageRows"
            :key="keyOf(row)"
            class="fn-row cursor-pointer"
            :class="[i % 2 === 1 ? 'fn-row-even' : '', selected === keyOf(row) ? 'fn-row-selected' : '']"
            :aria-selected="selected === keyOf(row)"
            @click="selectRow(row)"
          >
            <td
              v-for="(col, ci) in visibleColumns"
              :key="col.key"
              class="fn-td"
              :class="[
                cellClasses(col),
                inRect(rect, i, ci) && rectSize > 1 ? 'fn-cell-sel' : '',
                focus && focus.r === i && focus.c === ci ? 'fn-cell-focus' : '',
              ]"
              :style="pinStyle(col)"
              :data-cell="`${i}-${ci}`"
              role="gridcell"
              @mousedown="onCellDown($event, i, ci)"
              @mouseenter="onCellEnter(i, ci)"
            >
              <slot :name="`cell-${col.key}`" :row="row" :text="cellText(col, row)">
                <template v-if="col.type === 'index'">{{ info.from + i }}</template>
                <StatusBadge v-else-if="col.type === 'status'" :status="col.status?.(row)" />
                <span v-else class="fn-cell-text block" :title="cellText(col, row)">{{ cellText(col, row) }}</span>
              </slot>
            </td>
          </tr>
          <tr v-if="!loading && pageRows.length === 0">
            <td :colspan="visibleColumns.length" class="px-3 py-10 text-center text-base text-ink-gray-6">
              {{ anyFilter ? 'Không có dữ liệu khớp bộ lọc.' : 'Chưa có dữ liệu.' }}
              <button v-if="anyFilter" type="button" class="ml-1 text-ink-blue-link underline" @click="clearFilters">
                Xóa bộ lọc
              </button>
            </td>
          </tr>
        </tbody>

        <tfoot v-if="hasTotals && pageRows.length > 0">
          <tr class="fn-total-row">
            <td v-for="(col, ci) in visibleColumns" :key="col.key" class="fn-td-total" :class="cellClasses(col)" :style="pinStyle(col)">
              <template v-if="ci === 0">Tổng</template>
              <template v-else-if="col.sum">{{ formatTotal(col, totals[col.key]) }}</template>
            </td>
          </tr>
        </tfoot>
      </table>

      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center gap-2 bg-surface-base/70 text-base text-ink-gray-7"
        role="status"
      >
        <LoadingIndicator class="size-5 text-fn-brand" /> Đang tải dữ liệu…
      </div>
    </div>

    <nav
      class="flex flex-wrap items-center justify-end gap-3 border-t border-outline-gray-1 px-3 py-2 text-base text-ink-gray-7"
      aria-label="Phân trang"
    >
      <span v-if="rectSize > 1" class="mr-auto text-sm text-ink-gray-6" aria-live="polite">
        Đang chọn {{ rectSize }} ô · Ctrl+C để sao chép, Ctrl+Shift+C kèm tiêu đề
      </span>
      <label class="flex items-center gap-2 whitespace-nowrap">
        Số dòng
        <select v-model.number="pageSize" class="fn-page-input w-20">
          <option v-for="n in sizeOptions" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <span class="whitespace-nowrap tabular-nums">({{ info.from }}-{{ info.to }} / {{ info.total }} bản ghi)</span>
      <Button size="sm" variant="ghost" icon="lucide-chevron-left" aria-label="Trang trước" :disabled="info.page <= 1" @click="page = info.page - 1" />
      <span class="whitespace-nowrap tabular-nums">Trang {{ info.page }} / {{ info.pageCount }}</span>
      <Button
        size="sm"
        variant="ghost"
        icon="lucide-chevron-right"
        aria-label="Trang sau"
        :disabled="info.page >= info.pageCount"
        @click="page = info.page + 1"
      />
      <label class="flex items-center gap-2 whitespace-nowrap">
        Đến trang
        <input
          v-model="gotoText"
          type="text"
          inputmode="numeric"
          class="fn-page-input w-16"
          aria-label="Số trang muốn đến, nhấn Enter"
          @keydown.enter.prevent="goTo"
        />
      </label>
    </nav>
  </div>
</template>

<style scoped>
.fn-th-group {
  position: sticky;
  z-index: 3;
  height: 30px;
  padding: 0 12px;
  background: var(--fn-gh, theme('colors.fn.table-head'));
  border-bottom: 1px solid rgb(255 255 255 / 0.7);
  border-right: 2px solid #fff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--fn-ct, var(--ink-gray-8));
  text-align: center;
  white-space: nowrap;
}
.fn-th-group-empty {
  background: var(--fn-ch, theme('colors.fn.table-head'));
  border-right: 0;
  border-bottom-color: transparent;
}
.fn-th {
  position: sticky;
  z-index: 2;
  height: 36px;
  padding: 0 10px 0 12px;
  background: var(--fn-ch, theme('colors.fn.table-head'));
  border-bottom: 2px solid var(--fn-ca, theme('colors.fn.table-head-border'));
  color: var(--fn-ct, var(--ink-gray-8));
  white-space: nowrap;
}
.fn-th-label {
  color: var(--fn-ct, var(--ink-gray-8));
}
.fn-th-label:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.fn-th-filter {
  position: sticky;
  z-index: 2;
  height: 38px;
  padding: 3px 6px;
  background: #fbfcfd;
  border-bottom: 1px solid var(--outline-gray-2);
}
.fn-th.fn-pinned,
.fn-th-filter.fn-pinned,
.fn-th-group.fn-pinned {
  z-index: 4;
}
/* Mép giãn cột: vạch mảnh luôn thấy được (gợi ý kéo), đậm lên khi rê chuột hoặc đang kéo. */
.fn-resize {
  position: absolute;
  top: 6px;
  bottom: 6px;
  right: 0;
  z-index: 6;
  width: 7px;
  cursor: col-resize;
  touch-action: none;
}
.fn-resize::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 1px;
  background: theme('colors.fn.table-head-border');
}
.fn-resize:hover::after,
.fn-resize:focus-visible::after,
.fn-resize-active::after {
  right: 0;
  width: 3px;
  background: theme('colors.fn.brand');
}
.fn-col-menu {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  background: var(--fn-ch, theme('colors.fn.table-head'));
  opacity: 0;
}
.fn-th:hover .fn-col-menu,
.fn-col-menu:focus-visible,
.fn-col-menu[data-state='open'] {
  opacity: 1;
}
.fn-filter-input {
  width: 100%;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--outline-gray-2);
  background: var(--surface-base);
  padding: 0 6px;
  font-size: 13px;
  color: var(--ink-gray-8);
}
.fn-page-input {
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--outline-gray-2);
  background: var(--surface-base);
  padding: 0 6px;
  font-size: 13px;
  color: var(--ink-gray-8);
}
.fn-td {
  height: var(--fn-row-h, 40px);
  padding: 4px 12px;
  border-bottom: 1px solid theme('colors.fn.line');
  background: var(--surface-base);
  color: var(--ink-gray-8);
  max-width: 0;
}
.fn-grid .fn-td,
.fn-grid .fn-th,
.fn-grid .fn-th-filter {
  border-right: 1px solid theme('colors.fn.table-head-border');
}
.fn-cell-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fn-wrap .fn-cell-text {
  white-space: normal;
  overflow-wrap: anywhere;
}
.fn-row-even .fn-td {
  background: theme('colors.fn.zebra');
}
.fn-td.fn-pinned {
  position: sticky;
  z-index: 1;
  background: theme('colors.fn.pinned');
}
.fn-row:hover .fn-td {
  background: var(--surface-gray-1);
}
.fn-row-selected .fn-td,
.fn-row-selected:hover .fn-td {
  background: theme('colors.fn.selected');
}
.fn-row-selected .fn-td:first-child {
  box-shadow: inset 3px 0 0 theme('colors.fn.brand');
}
.fn-grid-scroll:focus {
  outline: none;
}
.fn-grid-scroll:focus-visible {
  box-shadow: inset 0 0 0 2px theme('colors.fn.brand');
}
.fn-row .fn-td.fn-cell-sel,
.fn-row:hover .fn-td.fn-cell-sel,
.fn-row-even .fn-td.fn-cell-sel,
.fn-row-selected .fn-td.fn-cell-sel,
.fn-row .fn-td.fn-pinned.fn-cell-sel {
  background: theme('colors.fn.cell-sel');
}
.fn-td.fn-cell-focus {
  box-shadow: inset 0 0 0 2px theme('colors.fn.brand');
}
.fn-row:focus-visible {
  outline: 2px solid theme('colors.fn.brand');
  outline-offset: -2px;
}
.fn-pin-edge-left {
  box-shadow: 4px 0 6px -4px rgb(0 0 0 / 0.14);
}
.fn-pin-edge-right {
  box-shadow: -4px 0 6px -4px rgb(0 0 0 / 0.14);
}
.fn-row-selected .fn-td.fn-pin-edge-left:first-child {
  box-shadow: inset 3px 0 0 theme('colors.fn.brand'), 4px 0 6px -4px rgb(0 0 0 / 0.14);
}
.fn-td-total {
  position: sticky;
  bottom: 0;
  z-index: 2;
  height: 42px;
  padding: 0 12px;
  background: theme('colors.fn.brand-soft');
  border-top: 2px solid theme('colors.fn.brand');
  font-weight: 700;
  color: #123e70;
  white-space: nowrap;
}
.fn-td-total.fn-pinned {
  z-index: 3;
}
</style>
