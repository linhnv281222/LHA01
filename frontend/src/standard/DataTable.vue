<script setup lang="ts" generic="T extends Record<string, any>">
// Bảng danh sách chuẩn:
// - tiêu đề xám nhạt, chỉ kẻ ngang (không kẻ dọc), hàng lọc ngay dưới, bấm tiêu đề để sắp xếp
// - ô nhiều dòng (ví dụ tên + mô tả) đặt qua slot cell-<key>; dòng tự cao theo nội dung
// - 20 dòng/trang (16 với bảng tiêu đề 2 cấp), chọn 20/50/100, ô "Đến trang", "(a-b / tổng)"
// - dòng chẵn lẻ khác màu, ghim cột trái/phải có bóng, nút ẩn/hiện cột
// - dòng Tổng dính đáy, tính trên toàn bộ dữ liệu đã lọc
// - trống: "Không có dữ liệu khớp bộ lọc" + "Xóa bộ lọc"; bấm dòng để chọn (hiện chi tiết bên dưới)
import { computed, ref, watch } from 'vue'
import { Button, LoadingIndicator, Popover } from 'frappe-ui'
import StatusBadge from './StatusBadge.vue'
import {
  applyColumnFilters,
  cellText,
  computeTotals,
  downloadCsv,
  formatTotal,
  nextSort,
  pageInfo,
  paginate,
  pinOffsets,
  sortRows,
  type Column,
  type SortState,
} from './table'

const props = withDefaults(
  defineProps<{
    columns: Column<T>[]
    rows: T[]
    rowKey?: string
    loading?: boolean
    /** 1: tiêu đề một cấp (20 dòng/trang); 2: tiêu đề hai cấp (16 dòng/trang). */
    headerLevel?: 1 | 2
    pageSizes?: number[]
    /** Chiều cao tối đa vùng bảng. Mặc định để màn 1900x887 hiện 11-12 dòng. */
    maxHeight?: string
    /** Có bộ lọc ngoài bảng (panel trái) đang bật, để hiện link "Xóa bộ lọc" khi trống. */
    externalFilterActive?: boolean
    caption?: string
  }>(),
  {
    rowKey: 'name',
    loading: false,
    headerLevel: 1,
    pageSizes: () => [20, 50, 100],
    maxHeight: 'max(320px, calc(100vh - 330px))',
    externalFilterActive: false,
    caption: '',
  },
)

const selected = defineModel<string | null>('selected', { default: null })
const emit = defineEmits<{ 'clear-filters': [] }>()

const columnFilters = ref<Record<string, string>>({})
const sort = ref<SortState>(null)
const pageSize = ref(props.headerLevel === 2 ? 16 : 20)
const page = ref(1)
const gotoText = ref('')
const hiddenKeys = ref<Set<string>>(new Set(props.columns.filter((c) => c.hidden).map((c) => c.key)))

const sizeOptions = computed(() => {
  const base = props.headerLevel === 2 ? [16, ...props.pageSizes.filter((n) => n !== 20)] : props.pageSizes
  return Array.from(new Set(base)).sort((a, b) => a - b)
})

const visibleColumns = computed(() => props.columns.filter((c) => !hiddenKeys.value.has(c.key)))
const offsets = computed(() => pinOffsets(visibleColumns.value))
const lastLeftPinned = computed(() => {
  const left = visibleColumns.value.filter((c) => c.pin === 'left')
  return left.length ? left[left.length - 1].key : null
})
const firstRightPinned = computed(() => visibleColumns.value.find((c) => c.pin === 'right')?.key ?? null)
const tableWidth = computed(() => visibleColumns.value.reduce((s, c) => s + c.width, 0))

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

function toggleSort(col: Column<T>) {
  if (col.sortable === false || col.type === 'index') return
  sort.value = nextSort(sort.value, col.key)
}

function ariaSort(col: Column<T>): 'ascending' | 'descending' | 'none' {
  if (sort.value?.key !== col.key) return 'none'
  return sort.value.dir === 'asc' ? 'ascending' : 'descending'
}

function toggleColumn(key: string) {
  const next = new Set(hiddenKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  hiddenKeys.value = next
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

function pinStyle(col: Column<T>, extra: Record<string, string> = {}) {
  const style: Record<string, string> = { width: `${col.width}px`, minWidth: `${col.width}px`, ...extra }
  const p = offsets.value[col.key]
  if (p) style[p.side] = `${p.offset}px`
  return style
}

function cellClasses(col: Column<T>) {
  return [
    offsets.value[col.key] ? 'fn-pinned' : '',
    col.key === lastLeftPinned.value ? 'fn-pin-edge-left' : '',
    col.key === firstRightPinned.value ? 'fn-pin-edge-right' : '',
    col.align === 'right' || col.type === 'number' || col.type === 'currency'
      ? 'text-right tabular-nums'
      : col.align === 'center' || col.type === 'index'
        ? 'text-center tabular-nums'
        : 'text-left',
  ]
}

/** Dữ liệu đã lọc và sắp xếp (mọi trang), theo các cột đang hiện. Dùng cho nút Xuất Excel. */
function exportExcel(fileName: string) {
  downloadCsv(sorted.value, visibleColumns.value, fileName)
}

defineExpose({ exportExcel, filteredRows: sorted, clearColumnFilters: () => (columnFilters.value = {}) })
</script>

<template>
  <div class="fn-table overflow-hidden rounded-6 border border-outline-gray-2 bg-surface-base">
    <div class="flex items-center justify-between gap-2 border-b border-outline-gray-1 px-3 py-1.5">
      <span class="text-sm text-ink-gray-6">{{ caption }}</span>
      <Popover>
        <template #trigger>
          <Button size="sm" variant="ghost" icon-left="lucide-columns-3" label="Cột" aria-label="Ẩn hoặc hiện cột" />
        </template>
        <div class="w-60 space-y-1 rounded-6 bg-surface-elevation-2 p-2 shadow-2xl">
          <p class="px-1 pb-1 text-sm text-ink-gray-5">Chọn cột hiển thị</p>
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
            {{ col.label }}
          </label>
        </div>
      </Popover>
    </div>

    <div class="relative overflow-auto" :style="{ maxHeight }">
      <table class="border-separate border-spacing-0 text-base" :style="{ width: `${tableWidth}px`, minWidth: '100%' }">
        <thead>
          <tr class="fn-head-row">
            <th
              v-for="col in visibleColumns"
              :key="col.key"
              scope="col"
              class="fn-th"
              :class="cellClasses(col)"
              :style="pinStyle(col)"
              :aria-sort="ariaSort(col)"
            >
              <button
                v-if="col.sortable !== false && col.type !== 'index'"
                type="button"
                class="inline-flex w-full items-center gap-1 text-sm-semibold text-ink-gray-7 hover:text-ink-gray-9"
                :class="col.align === 'right' || col.type === 'number' || col.type === 'currency' ? 'justify-end' : ''"
                @click="toggleSort(col)"
              >
                {{ col.label }}
                <span
                  class="size-3.5 shrink-0"
                  :class="
                    sort?.key === col.key
                      ? sort.dir === 'asc'
                        ? 'lucide-arrow-up text-fn-brand'
                        : 'lucide-arrow-down text-fn-brand'
                      : 'lucide-arrow-up-down text-ink-gray-4'
                  "
                  aria-hidden="true"
                />
              </button>
              <span v-else class="text-sm-semibold text-ink-gray-7">{{ col.label }}</span>
            </th>
          </tr>
          <tr class="fn-filter-row">
            <th v-for="col in visibleColumns" :key="col.key" class="fn-th-filter" :class="cellClasses(col)" :style="pinStyle(col)">
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
            tabindex="0"
            :aria-selected="selected === keyOf(row)"
            @click="selectRow(row)"
            @keydown.enter.prevent="selectRow(row)"
          >
            <td v-for="col in visibleColumns" :key="col.key" class="fn-td" :class="cellClasses(col)" :style="pinStyle(col)">
              <slot :name="`cell-${col.key}`" :row="row" :text="cellText(col, row)">
                <template v-if="col.type === 'index'">{{ info.from + i }}</template>
                <StatusBadge v-else-if="col.type === 'status'" :status="col.status?.(row)" />
                <span v-else class="block truncate" :title="cellText(col, row)">{{ cellText(col, row) }}</span>
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
.fn-th {
  position: sticky;
  top: 0;
  z-index: 2;
  height: 36px;
  padding: 0 12px;
  background: theme('colors.fn.table-head');
  border-bottom: 1px solid theme('colors.fn.table-head-border');
  white-space: nowrap;
}
.fn-th-filter {
  position: sticky;
  top: 36px;
  z-index: 2;
  height: 38px;
  padding: 3px 6px;
  background: theme('colors.fn.table-head');
  border-bottom: 1px solid theme('colors.fn.table-head-border');
}
.fn-th.fn-pinned,
.fn-th-filter.fn-pinned {
  z-index: 4;
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
  height: 40px;
  padding: 6px 12px;
  border-bottom: 1px solid theme('colors.fn.line');
  background: var(--surface-base);
  color: var(--ink-gray-8);
  max-width: 0;
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
  height: 40px;
  padding: 0 12px;
  background: theme('colors.fn.zebra');
  border-top: 1px solid var(--outline-gray-2);
  font-weight: 600;
  color: var(--ink-gray-9);
  white-space: nowrap;
}
.fn-td-total.fn-pinned {
  z-index: 3;
}
</style>
