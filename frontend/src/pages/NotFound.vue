<script setup lang="ts">
import { PrimaryButton } from '@/standard'
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
    <span class="lucide-map-pin-off size-8 text-ink-gray-5" aria-hidden="true" />
    <h1 class="text-2xl-semibold text-ink-gray-9">Không tìm thấy trang</h1>
    <p class="text-p-base text-ink-gray-6">Đường dẫn không đúng hoặc trang đã được chuyển đi.</p>
    <PrimaryButton label="Về trang chủ" :route="'/'" />
  </div>
</template>
