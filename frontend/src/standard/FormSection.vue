<script setup lang="ts">
// Nhóm thông tin trong form. Vùng phụ dùng muted (nền xám nhẹ) để vùng chính nổi bật; không tô xám cả form.
// Ô rộng hơn một cột: đặt class col-span-2 (hoặc col-span-3) lên FnField. Form nhiều ô ngắn dùng columns=4.
withDefaults(defineProps<{ title: string; description?: string; muted?: boolean; columns?: 1 | 2 | 3 | 4 }>(), {
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
    <slot name="header" />
    <p v-if="description" class="mt-1 text-p-sm text-ink-gray-5">{{ description }}</p>
    <div
      class="mt-4 grid gap-x-6 gap-y-4"
      :class="{ 'grid-cols-1': columns === 1, 'grid-cols-2': columns === 2, 'grid-cols-3': columns === 3, 'grid-cols-4': columns === 4 }"
    >
      <slot />
    </div>
  </section>
</template>
