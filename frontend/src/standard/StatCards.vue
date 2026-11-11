<script setup lang="ts">
// Thẻ số liệu tổng hợp phía trên bảng, tính trên tập đã lọc.
// Bấm thẻ trạng thái để lọc theo trạng thái đó; bấm lại để bỏ lọc. Thẻ "Tổng" không lọc.
import { TONE_CLASSES } from './status'
import type { StatCard } from './types'

defineProps<{ cards: StatCard[] }>()
const active = defineModel<string | null>('active', { default: null })

function onClick(card: StatCard) {
  if (!card.status) return
  active.value = active.value === card.key ? null : card.key
}
</script>

<template>
  <div class="grid gap-3" :style="{ gridTemplateColumns: `repeat(${Math.min(cards.length, 6)}, minmax(0, 1fr))` }">
    <component
      :is="card.status ? 'button' : 'div'"
      v-for="card in cards"
      :key="card.key"
      :type="card.status ? 'button' : undefined"
      class="flex items-center gap-3 rounded-6 border bg-surface-base px-4 py-3 text-left"
      :class="[
        active === card.key ? 'border-fn-brand ring-2 ring-fn-brand/30' : 'border-outline-gray-2',
        card.status ? 'cursor-pointer hover:border-fn-brand' : '',
      ]"
      :aria-pressed="card.status ? active === card.key : undefined"
      @click="onClick(card)"
    >
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-full border"
        :class="card.status ? TONE_CLASSES[card.status.tone] : 'border-outline-blue-3 bg-fn-brand-soft text-fn-brand'"
        aria-hidden="true"
      >
        <span :class="card.status?.icon ?? 'lucide-sigma'" class="size-4" />
      </span>
      <span class="min-w-0">
        <span class="block truncate text-sm text-ink-gray-6">{{ card.label }}</span>
        <span class="block text-2xl-semibold tabular-nums text-ink-gray-9">{{ card.value }}</span>
      </span>
    </component>
  </div>
</template>
