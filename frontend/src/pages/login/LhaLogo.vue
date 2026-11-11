<script setup lang="ts">
// Chỗ DUY NHẤT vẽ logo. Logo tạm là chữ "LHA".
// Khi có file logo, thay khối bên dưới bằng:
//   <img src="/assets/contract_tracker/images/lha-logo.png" alt="Logo Công ty LHA">
defineProps<{ size: 'lg' | 'sm' }>()
</script>

<template>
  <div
    role="img"
    aria-label="Logo Công ty LHA"
    :class="
      size === 'lg'
        ? 'flex size-28 items-center justify-center rounded-3xl bg-surface-white text-4xl font-bold text-fn-brand'
        : 'mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-fn-brand text-xl font-bold text-ink-white lg:hidden'
    "
  >
    LHA
  </div>
</template>
