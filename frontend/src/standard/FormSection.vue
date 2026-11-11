<script setup lang="ts">
// Nhóm thông tin trong form. Vùng phụ dùng muted (nền xám nhẹ) để vùng chính nổi bật; không tô xám cả form.
withDefaults(defineProps<{ title: string; description?: string; muted?: boolean; columns?: 1 | 2 | 3 }>(), {
  description: '',
  muted: false,
  columns: 2,
})
</script>

<template>
  <section
    class="rounded-6 border border-outline-gray-2 p-4"
    :class="muted ? 'bg-surface-gray-1' : 'bg-surface-base'"
  >
    <h2 class="text-lg-semibold text-ink-gray-9">{{ title }}</h2>
    <p v-if="description" class="mt-1 text-p-sm text-ink-gray-5">{{ description }}</p>
    <div
      class="mt-4 grid gap-x-6 gap-y-4"
      :class="{ 'grid-cols-1': columns === 1, 'grid-cols-2': columns === 2, 'grid-cols-3': columns === 3 }"
    >
      <slot />
    </div>
  </section>
</template>
