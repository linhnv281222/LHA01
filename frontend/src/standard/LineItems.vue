<script setup lang="ts" generic="T extends Record<string, any>">
// Bảng nhập nhiều dòng trong form (hạng mục, dòng chi tiết...): tiêu đề cột là nhãn, mỗi ô là một FnField
// có hide-label. Không dùng <table>/<input> thô ở trang; trang khai báo cột và đặt ô vào slot "cell-<key>".
// - Cột tiền/số căn phải; cột chỉ đọc (tự tính) dùng slot hiển thị chữ, không dùng ô nhập.
// - Dòng Tổng ở cuối (prop totals), nút "Thêm ..." dưới bảng, nút xóa từng dòng (hỏi lại do trang quyết).
// - Thông tin phụ của một dòng (ví dụ các ô của hạng mục định kỳ) đặt ở slot "extra": hiện ngay dưới dòng.
import type { LineColumn } from './types'

const props = withDefaults(
  defineProps<{
    columns: LineColumn[]
    rows: T[]
    rowKey?: string
    /** Nhãn nút thêm dòng, ví dụ "Thêm hạng mục". Bỏ trống thì không có nút. */
    addLabel?: string
    /** Giá trị dòng Tổng theo key cột; cột đầu tiên có giá trị là nhãn (ví dụ "Tổng 3 hạng mục"). */
    totals?: Record<string, string | number> | null
    removable?: boolean
    readonly?: boolean
    emptyText?: string
  }>(),
  { rowKey: 'name', addLabel: '', totals: null, removable: true, readonly: false, emptyText: 'Chưa có dòng nào.' },
)
const emit = defineEmits<{ add: []; remove: [index: number] }>()

const template = () =>
  ['2.25rem', ...props.columns.map((c) => c.width ?? 'minmax(0,1fr)'), props.removable && !props.readonly ? '2.25rem' : '']
    .filter(Boolean)
    .join(' ')

function alignClass(c: LineColumn) {
  return c.align === 'right' ? 'justify-end text-right' : c.align === 'center' ? 'justify-center text-center' : ''
}
function keyOf(row: T, i: number) {
  const k = row[props.rowKey]
  return k === undefined || k === null || k === '' ? `i-${i}` : String(k)
}
</script>

<template>
  <div class="fn-lines overflow-x-auto rounded-6 border border-outline-gray-2 bg-surface-base" role="table">
    <div class="fn-lines-head" :style="{ gridTemplateColumns: template() }" role="row">
      <span role="columnheader" class="fn-lines-th">#</span>
      <span
        v-for="c in columns"
        :key="c.key"
        role="columnheader"
        class="fn-lines-th flex items-center gap-0.5"
        :class="alignClass(c)"
      >
        {{ c.label }}<span v-if="c.required" class="text-ink-red-6" aria-hidden="true">*</span>
      </span>
      <span v-if="removable && !readonly" role="columnheader" class="fn-lines-th"><span class="sr-only">Xóa</span></span>
    </div>

    <div v-for="(row, i) in rows" :key="keyOf(row, i)" class="fn-lines-row" role="rowgroup">
      <div class="grid items-start" :style="{ gridTemplateColumns: template() }" role="row">
        <span role="cell" class="fn-lines-td flex min-h-[44px] items-center text-base text-ink-gray-5 tabular-nums">{{ i + 1 }}</span>
        <div v-for="c in columns" :key="c.key" role="cell" class="fn-lines-td min-w-0" :class="c.readonly ? ['flex min-h-[44px] items-center text-base tabular-nums text-ink-gray-8', alignClass(c)] : ''">
          <slot :name="`cell-${c.key}`" :row="row" :index="i" />
        </div>
        <div v-if="removable && !readonly" role="cell" class="fn-lines-td">
          <button
            type="button"
            class="mt-1 flex size-7 items-center justify-center rounded-4 text-ink-gray-5 hover:bg-surface-red-2 hover:text-ink-red-7"
            :aria-label="`Xóa dòng ${i + 1}`"
            :title="`Xóa dòng ${i + 1}`"
            @click="emit('remove', i)"
          >
            <span class="lucide-trash-2 size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div v-if="$slots.extra" class="fn-lines-extra">
        <slot name="extra" :row="row" :index="i" />
      </div>
    </div>

    <p v-if="!rows.length" class="px-3 py-4 text-center text-base text-ink-gray-5">{{ emptyText }}</p>

    <div v-if="totals && rows.length" class="fn-lines-total" :style="{ gridTemplateColumns: template() }" role="row">
      <span role="cell" />
      <span v-for="c in columns" :key="c.key" role="cell" class="flex px-1.5 tabular-nums" :class="alignClass(c)">
        {{ totals[c.key] ?? '' }}
      </span>
      <span v-if="removable && !readonly" role="cell" />
    </div>

    <button
      v-if="addLabel && !readonly"
      type="button"
      class="flex w-full items-center gap-1.5 border-t border-outline-gray-1 px-3 py-2.5 text-base-medium text-ink-blue-link hover:bg-surface-gray-1"
      @click="emit('add')"
    >
      <span class="lucide-plus size-4" aria-hidden="true" />{{ addLabel }}
    </button>
  </div>
</template>

<style scoped>
.fn-lines-head {
  display: grid;
  align-items: center;
  min-height: 36px;
  background: theme('colors.fn.table-head');
  border-bottom: 1px solid theme('colors.fn.table-head-border');
}
.fn-lines-th {
  padding: 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-gray-6);
  white-space: nowrap;
}
.fn-lines-th:first-child {
  padding-left: 12px;
}
.fn-lines-row {
  border-bottom: 1px solid theme('colors.fn.line');
}
.fn-lines-td {
  padding: 6px;
}
.fn-lines-td:first-child {
  padding-left: 12px;
}
.fn-lines-extra {
  padding: 0 calc(2.25rem + 6px) 10px calc(2.25rem + 6px);
}
.fn-lines-total {
  display: grid;
  align-items: center;
  min-height: 40px;
  background: theme('colors.fn.zebra');
  font-weight: 600;
  color: var(--ink-gray-9);
}
</style>
