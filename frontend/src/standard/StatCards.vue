<script setup lang="ts">
// Dải số liệu tổng hợp phía trên bảng, tính trên tập đã lọc. Mỗi ô là một thẻ riêng có nền nhạt và vạch màu bên trái
// theo ý nghĩa: tone (đã thu: green, còn phải thu: amber, quá hạn: red); ô trạng thái lấy màu của trạng thái;
// ô không khai báo màu dùng xanh dương (số tổng).
// Ô có status bấm được để lọc theo trạng thái đó; bấm lại để bỏ lọc. Ô không có status chỉ để xem.
// hint là dòng phụ, progress là thanh tiến độ (cùng màu thẻ).
import { TONE_CLASSES } from './status'
import type { StatCard } from './types'

withDefaults(defineProps<{ cards: StatCard[]; /** Chữ số nhỏ hơn, dùng trong khối hẹp (DetailPanel #aside). */ compact?: boolean }>(), { compact: false })
const active = defineModel<string | null>('active', { default: null })

// bg: nền thẻ, bar: vạch trái và thanh tiến độ, ink: màu con số.
const PALETTE: Record<string, { bg: string; bar: string; ink: string }> = {
  blue: { bg: '#EEF4FB', bar: '#1D5FA8', ink: '#123E70' },
  green: { bg: '#ECF8F1', bar: '#16A34A', ink: '#15803D' },
  amber: { bg: '#FDF6E7', bar: '#D97706', ink: '#B45309' },
  orange: { bg: '#FFF1E8', bar: '#EA580C', ink: '#C2410C' },
  red: { bg: '#FDEFEF', bar: '#DC2626', ink: '#B91C1C' },
  violet: { bg: '#F3EFFB', bar: '#7C5BD6', ink: '#5B3FB0' },
  teal: { bg: '#EAF6F3', bar: '#0F766E', ink: '#0F5F59' },
  gray: { bg: '#F3F5F8', bar: '#64748B', ink: '#1F2937' },
  dark: { bg: '#F1F2F4', bar: '#1F2937', ink: '#111827' },
}
function toneOf(card: StatCard) {
  const key = card.tone ?? (card.status?.tone as string | undefined) ?? 'blue'
  const t = PALETTE[key] ?? PALETTE.blue
  return { '--fn-s-bg': t.bg, '--fn-s-bar': t.bar, '--fn-s-ink': t.ink }
}

function onClick(card: StatCard) {
  if (!card.status) return
  active.value = active.value === card.key ? null : card.key
}
</script>

<template>
  <div
    class="grid"
    :class="compact ? 'gap-2' : 'gap-3'"
    :style="{ gridTemplateColumns: `repeat(${Math.min(cards.length, 6)}, minmax(0, 1fr))` }"
  >
    <component
      :is="card.status ? 'button' : 'div'"
      v-for="card in cards"
      :key="card.key"
      :type="card.status ? 'button' : undefined"
      class="fn-stat relative min-w-0 text-left"
      :class="[
        compact ? 'py-2 pl-3 pr-2' : 'py-3 pl-5 pr-4',
        card.status ? 'fn-stat-click cursor-pointer' : '',
        active === card.key ? 'fn-stat-active' : '',
      ]"
      :style="toneOf(card)"
      :aria-pressed="card.status ? active === card.key : undefined"
      @click="onClick(card)"
    >
      <span class="flex items-center gap-1.5 truncate text-sm-medium text-ink-gray-6">
        <span
          v-if="card.status"
          class="size-2 shrink-0 rounded-full border"
          :class="TONE_CLASSES[card.status.tone]"
          aria-hidden="true"
        />
        {{ card.label }}
      </span>
      <span
        class="fn-stat-value mt-0.5 block truncate tabular-nums"
        :class="compact ? 'text-lg-semibold' : 'text-2xl-semibold'"
        :title="String(card.value)"
      >
        {{ card.value }}
      </span>
      <span
        v-if="card.progress !== undefined"
        class="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/80"
        role="progressbar"
        :aria-valuenow="Math.round(card.progress)"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="card.label"
      >
        <span class="fn-stat-bar block h-full rounded-full" :style="{ width: `${Math.min(100, Math.max(0, card.progress))}%` }" />
      </span>
      <span v-if="card.hint" class="mt-0.5 block truncate text-sm text-ink-gray-5" :title="card.hint">{{ card.hint }}</span>
    </component>
  </div>
</template>

<style scoped>
.fn-stat {
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--fn-s-bar) 22%, transparent);
  background: var(--fn-s-bg);
  overflow: hidden;
}
.fn-stat::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--fn-s-bar);
}
.fn-stat-value {
  color: var(--fn-s-ink);
}
.fn-stat-bar {
  background: var(--fn-s-bar);
}
.fn-stat-click:hover {
  border-color: var(--fn-s-bar);
}
.fn-stat-active {
  border-color: var(--fn-s-bar);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--fn-s-bar) 35%, transparent);
}
</style>
