<script setup lang="ts">
// Bảng phụ nhỏ (lịch sử, dòng con trong chi tiết): tiêu đề vàng, dòng chẵn lẻ, không phân trang.
// Danh sách chính luôn dùng DataTable.
import type { Column } from './table'
import { cellText } from './table'

withDefaults(defineProps<{ columns: Column<any>[]; rows: Record<string, any>[]; rowKey?: string; emptyText?: string }>(), {
  rowKey: 'name',
  emptyText: 'Không có dữ liệu.',
})
</script>

<template>
  <table class="w-full border-separate border-spacing-0 text-base">
    <thead>
      <tr>
        <th
          v-for="col in columns"
          :key="col.key"
          scope="col"
          class="border-b border-fn-table-head-border bg-fn-table-head px-3 py-2 text-sm-semibold text-ink-gray-9"
          :class="col.type === 'number' || col.type === 'currency' ? 'text-right' : 'text-left'"
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
          class="border-b border-outline-gray-1 px-3 py-2 text-ink-gray-8"
          :class="col.type === 'number' || col.type === 'currency' ? 'text-right tabular-nums' : ''"
        >
          <slot :name="`cell-${col.key}`" :row="row" :text="cellText(col, row)">{{ col.type === 'index' ? i + 1 : cellText(col, row) }}</slot>
        </td>
      </tr>
      <tr v-if="!rows.length">
        <td :colspan="columns.length" class="px-3 py-3 text-center text-ink-gray-5">{{ emptyText }}</td>
      </tr>
    </tbody>
  </table>
</template>
