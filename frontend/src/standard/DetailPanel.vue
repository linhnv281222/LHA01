<script setup lang="ts">
// Chi tiết dòng đang chọn, hiện ngay dưới bảng (không mở trang khác).
// Có quick action sang màn cập nhật qua slot "actions". Bảng lịch sử liên quan đặt ở slot mặc định.
// Slot "badge": cạnh tiêu đề (StatusBadge). Slot "aside": khối bên phải các trường (ví dụ tóm tắt tiền).
// Trường trống hiện "Không có" chữ nhạt.
import type { DetailField } from './types'

defineProps<{ title: string; fields: DetailField[] }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <section class="fn-detail rounded-6 bg-surface-base" aria-live="polite">
    <header class="fn-detail-head flex items-center justify-between gap-2 px-4 py-2.5">
      <div class="flex min-w-0 items-center gap-2">
        <span class="lucide-file-text size-4 shrink-0 text-fn-brand" aria-hidden="true" />
        <h2 class="truncate text-lg-semibold text-ink-gray-9">{{ title }}</h2>
        <slot name="badge" />
      </div>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-4 text-ink-gray-6 hover:bg-surface-gray-2"
          aria-label="Đóng chi tiết"
          @click="emit('close')"
        >
          <span class="lucide-x size-4" aria-hidden="true" />
        </button>
      </div>
    </header>
    <div :class="$slots.aside ? 'grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''">
      <dl class="grid gap-x-6 gap-y-3 px-4 py-3" :class="$slots.aside ? 'grid-cols-3' : 'grid-cols-4'">
        <div v-for="f in fields" :key="f.label" :class="f.wide ? ($slots.aside ? 'col-span-3' : 'col-span-4') : ''">
          <dt class="text-sm text-ink-gray-5">{{ f.label }}</dt>
          <dd v-if="f.value === null || f.value === undefined || f.value === ''" class="mt-0.5 text-base text-ink-gray-4">Không có</dd>
          <dd v-else class="mt-0.5 break-words text-base text-ink-gray-9">{{ f.value }}</dd>
        </div>
      </dl>
      <div v-if="$slots.aside" class="border-l border-outline-gray-1 bg-surface-gray-1 px-4 py-3">
        <slot name="aside" />
      </div>
    </div>
    <div v-if="$slots.default" class="fn-detail-body px-4 py-4">
      <slot />
    </div>
  </section>
</template>

<style scoped>
/* Khối chi tiết tách hẳn khỏi bảng phía trên: viền đậm hơn, đổ bóng. Vùng bảng phụ nền xám, mỗi bảng phụ là một khung
   trắng có thanh tiêu đề (h3 của trang tự thành thanh tiêu đề, không cần sửa trang). */
.fn-detail {
  border: 1px solid #c9d3e0;
  box-shadow: 0 1px 3px rgb(16 24 40 / 0.08);
}
.fn-detail-body {
  border-top: 1px solid #d5dbe5;
  border-radius: 0 0 6px 6px;
  background: #f4f6f9;
}
.fn-detail-body :deep(h3) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 8px 12px;
  border: 1px solid #c9d3e0;
  border-bottom: 0;
  border-radius: 8px 8px 0 0;
  background: #fff;
  box-shadow: inset 4px 0 0 theme('colors.fn.brand');
  font-weight: 700;
  color: var(--ink-gray-9);
}
.fn-detail-body :deep(h3)::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: theme('colors.fn.brand');
}
.fn-detail-body :deep(h3 ~ h3) {
  margin-top: 16px;
}
.fn-detail-body :deep(h3 + .fn-mini) {
  border-radius: 0 0 8px 8px;
}
.fn-detail-head {
  border-radius: 6px 6px 0 0;
  background: #f3f7fc;
  border-bottom: 1px solid #d9e5f3;
  box-shadow: inset 4px 0 0 theme('colors.fn.brand');
}
</style>
