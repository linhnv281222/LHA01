<script setup lang="ts">
// Chi tiết dòng đang chọn, hiện ngay dưới bảng (không mở trang khác).
// Có quick action sang màn cập nhật qua slot "actions". Bảng lịch sử liên quan đặt ở slot mặc định.
import type { DetailField } from './types'

defineProps<{ title: string; fields: DetailField[] }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <section class="rounded-6 border border-outline-gray-2 bg-surface-base" aria-live="polite">
    <header class="flex items-center justify-between gap-2 border-b border-outline-gray-1 px-4 py-2">
      <h2 class="truncate text-lg-semibold text-ink-gray-9">{{ title }}</h2>
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
    <dl class="grid grid-cols-4 gap-x-6 gap-y-3 px-4 py-3">
      <div v-for="f in fields" :key="f.label" :class="f.wide ? 'col-span-4' : ''">
        <dt class="text-sm text-ink-gray-5">{{ f.label }}</dt>
        <dd class="mt-0.5 break-words text-base text-ink-gray-9">{{ f.value === null || f.value === undefined || f.value === '' ? '—' : f.value }}</dd>
      </div>
    </dl>
    <div v-if="$slots.default" class="border-t border-outline-gray-1 px-4 py-3">
      <slot />
    </div>
  </section>
</template>
