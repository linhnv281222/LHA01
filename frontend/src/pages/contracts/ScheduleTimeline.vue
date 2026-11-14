<script setup lang="ts">
// Dải tiến trình của một đợt thu: Nghiệm thu → Đề nghị → Hóa đơn → Thanh toán (+ nhãn Quá hạn).
// Mỗi bước có icon + chữ (không chỉ màu); bước hiện tại là bước đầu tiên chưa xong.
import { computed } from 'vue'
import { StatusBadge } from '@/standard'
import { scheduleTimeline, type ScheduleRow } from './contract'

const props = defineProps<{ row: ScheduleRow }>()
const timeline = computed(() => scheduleTimeline(props.row))
</script>

<template>
  <ol class="flex flex-nowrap items-center gap-1 whitespace-nowrap" aria-label="Tiến trình đợt thu">
    <li
      v-for="(step, i) in timeline.steps"
      :key="step.key"
      class="flex items-center gap-1"
      :aria-current="step.current ? 'step' : undefined"
    >
      <span v-if="i > 0" class="lucide-chevron-right size-3.5 shrink-0 text-ink-gray-4" aria-hidden="true" />
      <span
        class="inline-flex items-center rounded-full"
        :class="step.current ? 'ring-2 ring-outline-gray-4 font-semibold' : ''"
        :data-current="step.current ? 'true' : undefined"
      >
        <StatusBadge :status="{ ...step.status, label: `${step.title}: ${step.status.label}` }" />
      </span>
    </li>
    <li v-if="timeline.overdue" class="flex items-center gap-1">
      <span class="lucide-chevron-right size-3.5 shrink-0 text-ink-gray-4" aria-hidden="true" />
      <StatusBadge :status="timeline.overdue" />
    </li>
  </ol>
</template>
