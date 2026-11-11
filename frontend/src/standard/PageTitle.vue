<script setup lang="ts">
// Tiêu đề trang + badge số lượng + vùng nút. Nút chính (thêm mới) đặt ngoài cùng bên phải.
defineProps<{ title: string; count?: number; subtitle?: string }>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-2">
      <h1 class="truncate text-2xl-semibold text-ink-gray-9">{{ title }}</h1>
      <span
        v-if="count !== undefined"
        class="rounded-full bg-fn-brand-soft px-2 py-0.5 text-sm-semibold tabular-nums text-fn-brand"
        :aria-label="`${count} bản ghi`"
      >
        {{ count }}
      </span>
      <span v-if="subtitle" class="text-base text-ink-gray-5">{{ subtitle }}</span>
    </div>
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
