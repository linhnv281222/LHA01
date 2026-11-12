<script setup lang="ts">
// Dải số liệu tổng hợp phía trên bảng, tính trên tập đã lọc. Các ô nằm chung một khung, ngăn bằng đường kẻ.
// Ô có status bấm được để lọc theo trạng thái đó; bấm lại để bỏ lọc. Ô không có status chỉ để xem.
// tone tô màu con số theo ý nghĩa (đã thu: green, còn phải thu: amber), hint là dòng phụ, progress là thanh tiến độ.
import { TONE_CLASSES } from './status'
import type { StatCard } from './types'

withDefaults(defineProps<{ cards: StatCard[]; /** Chữ số nhỏ hơn, dùng trong khối hẹp (DetailPanel #aside). */ compact?: boolean }>(), { compact: false })
const active = defineModel<string | null>('active', { default: null })

const VALUE_TONE: Record<string, string> = {
  green: 'text-ink-green-7',
  amber: 'text-ink-amber-7',
  red: 'text-ink-red-7',
  blue: 'text-ink-blue-7',
}

function onClick(card: StatCard) {
  if (!card.status) return
  active.value = active.value === card.key ? null : card.key
}
</script>

<template>
  <div
    class="grid overflow-hidden rounded-6 border border-outline-gray-2 bg-surface-base"
    :style="{ gridTemplateColumns: `repeat(${Math.min(cards.length, 6)}, minmax(0, 1fr))` }"
  >
    <component
      :is="card.status ? 'button' : 'div'"
      v-for="(card, i) in cards"
      :key="card.key"
      :type="card.status ? 'button' : undefined"
      class="relative min-w-0 text-left"
      :class="[
        compact ? 'px-3 py-2' : 'px-4 py-3',
        i > 0 ? 'border-l border-outline-gray-1' : '',
        card.status ? 'cursor-pointer hover:bg-surface-gray-1' : '',
        active === card.key ? 'fn-stat-active' : '',
      ]"
      :aria-pressed="card.status ? active === card.key : undefined"
      @click="onClick(card)"
    >
      <span class="flex items-center gap-1.5 truncate text-sm text-ink-gray-5">
        <span
          v-if="card.status"
          class="size-2 shrink-0 rounded-full border"
          :class="TONE_CLASSES[card.status.tone]"
          aria-hidden="true"
        />
        {{ card.label }}
      </span>
      <span
        class="mt-0.5 block truncate tabular-nums"
        :class="[card.tone ? VALUE_TONE[card.tone] : 'text-ink-gray-9', compact ? 'text-lg-semibold' : 'text-2xl-semibold']"
        :title="String(card.value)"
      >
        {{ card.value }}
      </span>
      <span
        v-if="card.progress !== undefined"
        class="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-gray-3"
        role="progressbar"
        :aria-valuenow="Math.round(card.progress)"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="card.label"
      >
        <span class="block h-full rounded-full bg-surface-green-5" :style="{ width: `${Math.min(100, Math.max(0, card.progress))}%` }" />
      </span>
      <span v-if="card.hint" class="mt-0.5 block truncate text-sm text-ink-gray-5" :title="card.hint">{{ card.hint }}</span>
    </component>
  </div>
</template>

<style scoped>
.fn-stat-active {
  background: theme('colors.fn.brand-soft');
  box-shadow: inset 0 -2px 0 theme('colors.fn.brand');
}
</style>
