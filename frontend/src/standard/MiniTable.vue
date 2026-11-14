<script setup lang="ts">
// Bảng phụ nhỏ (lịch sử, dòng con trong chi tiết): tiêu đề xanh xám (khác bảng chính nền vàng để nhìn là biết bảng phụ),
// có khung, dòng xen kẽ, không phân trang. Đặt sau một <h3> trong DetailPanel thì h3 thành thanh tiêu đề của khung.
// Dòng Tổng: truyền totals (giá trị theo key cột; cột đầu có giá trị là nhãn, ví dụ "Tổng").
// Danh sách chính luôn dùng DataTable.
import type { Column } from './table'
import { cellText } from './table'

withDefaults(
  defineProps<{
    columns: Column<any>[]
    rows: Record<string, any>[]
    rowKey?: string
    emptyText?: string
    totals?: Record<string, string | number> | null
  }>(),
  { rowKey: 'name', emptyText: 'Không có dữ liệu.', totals: null },
)
const isNum = (c: Column<any>) => c.type === 'number' || c.type === 'currency' || c.align === 'right'
</script>

<template>
  <div class="fn-mini overflow-hidden">
  <table class="w-full border-separate border-spacing-0 text-base">
    <thead>
      <tr>
        <th
          v-for="col in columns"
          :key="col.key"
          scope="col"
          class="fn-mini-th px-3 py-2 text-sm-semibold"
          :class="isNum(col) ? 'text-right' : 'text-left'"
          :style="{ width: `${col.width}px` }"
        >
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, i) in rows" :key="String(row[rowKey])" :class="i % 2 ? 'bg-fn-zebra' : ''">
        <td
          v-for="col in columns"
          :key="col.key"
          class="border-b border-fn-line px-3 py-2 text-ink-gray-8"
          :class="isNum(col) ? 'text-right tabular-nums' : ''"
        >
          <slot :name="`cell-${col.key}`" :row="row" :text="cellText(col, row)">{{ col.type === 'index' ? i + 1 : cellText(col, row) }}</slot>
        </td>
      </tr>
      <tr v-if="!rows.length">
        <td :colspan="columns.length" class="px-3 py-3 text-center text-ink-gray-5">{{ emptyText }}</td>
      </tr>
    </tbody>
    <tfoot v-if="totals && rows.length">
      <tr>
        <td
          v-for="col in columns"
          :key="col.key"
          class="fn-mini-total px-3 py-2 font-semibold text-ink-gray-9"
          :class="isNum(col) ? 'text-right tabular-nums' : ''"
        >
          {{ totals[col.key] ?? '' }}
        </td>
      </tr>
    </tfoot>
  </table>
  </div>
</template>

<style scoped>
.fn-mini {
  border: 1px solid #c9d3e0;
  border-radius: 8px;
  background: var(--surface-base);
}
.fn-mini-th {
  background: #dce5f2;
  color: #1e3a5f;
  border-bottom: 1px solid #b9c7dc;
}
.fn-mini-th + .fn-mini-th {
  border-left: 1px solid #c9d5e6;
}
.fn-mini-total {
  background: #e3ebf8;
  border-top: 2px solid #aeb7c6;
}
</style>
