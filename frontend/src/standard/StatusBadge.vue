<script setup lang="ts">
// Nhãn trạng thái: icon + chữ + nền nhạt theo tone. Không bao giờ chỉ dùng màu.
import { computed } from 'vue'
import { TONE_CLASSES, type StatusDef } from './status'

const props = defineProps<{ status?: StatusDef }>()
const cls = computed(() => (props.status ? TONE_CLASSES[props.status.tone] : ''))
</script>

<template>
  <span
    v-if="status"
    class="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-sm-medium"
    :class="cls"
  >
    <span :class="status.icon" class="size-3.5 shrink-0" aria-hidden="true" />
    {{ status.label }}
  </span>
</template>
