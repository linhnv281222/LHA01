<script setup lang="ts">
// Bố cục chia đôi của màn danh sách:
// - Panel trái 260px (người dùng kéo mép để giãn 220-480px), cố định khi cuộn, cao bằng màn hình:
//   "Truy vấn nhóm" (ô tìm kiếm TRÊN cây) → kẻ ngang → "Truy vấn chi tiết" (các ô lọc).
//   Hai tiêu đề dính (sticky). Nút "Tìm kiếm" rộng hết panel, cố định ở đáy. Enter trong ô lọc = Tìm kiếm.
// - Vùng phải: tiêu đề trang, thẻ số liệu, bảng, chi tiết dòng chọn (do trang tự đặt vào slot mặc định).
import { ref, watch } from 'vue'
import { Button } from 'frappe-ui'

// Panel trái kéo giãn được (mép phải panel), 220-480px, nhớ trong trình duyệt. Nhấp đúp mép = về 260px.
const PANEL_KEY = 'fn-split-panel-width'
function loadWidth(): number {
  try {
    const n = Number(localStorage.getItem(PANEL_KEY))
    if (n >= 220 && n <= 480) return n
  } catch {
    /* bỏ qua */
  }
  return 260
}
const panelWidth = ref(loadWidth())
watch(panelWidth, (w) => {
  try {
    localStorage.setItem(PANEL_KEY, String(w))
  } catch {
    /* bỏ qua */
  }
})
let startX = 0
let startW = 0
function onMove(e: PointerEvent) {
  panelWidth.value = Math.min(480, Math.max(220, Math.round(startW + e.clientX - startX)))
}
function onDown(e: PointerEvent) {
  e.preventDefault()
  startX = e.clientX
  startW = panelWidth.value
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', () => window.removeEventListener('pointermove', onMove), { once: true })
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    panelWidth.value = Math.min(480, Math.max(220, panelWidth.value + (e.key === 'ArrowRight' ? 20 : -20)))
  }
}

withDefaults(
  defineProps<{
    groupTitle?: string
    filterTitle?: string
    /** Bỏ nhóm "Truy vấn nhóm" khi dữ liệu không có cây phân nhóm. */
    showGroup?: boolean
    searching?: boolean
  }>(),
  { groupTitle: 'Truy vấn nhóm', filterTitle: 'Truy vấn chi tiết', showGroup: true, searching: false },
)
const emit = defineEmits<{ search: [] }>()
</script>

<template>
  <div class="grid min-h-[calc(100vh-3rem)]" :style="{ gridTemplateColumns: `${panelWidth}px minmax(0,1fr)` }">
    <aside
      class="sticky top-12 flex h-[calc(100vh-3rem)] flex-col border-r border-outline-gray-2 bg-surface-base"
      aria-label="Bộ lọc"
    >
      <span
        class="fn-panel-resize"
        role="separator"
        aria-orientation="vertical"
        tabindex="0"
        :aria-valuenow="panelWidth"
        aria-valuemin="220"
        aria-valuemax="480"
        aria-label="Độ rộng panel bộ lọc. Phím mũi tên trái/phải để đổi"
        title="Kéo để giãn panel, nhấp đúp để về mặc định"
        @pointerdown="onDown"
        @dblclick="panelWidth = 260"
        @keydown="onKey"
      />
      <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="emit('search')">
        <div class="min-h-0 flex-1 overflow-y-auto">
          <section v-if="showGroup" aria-labelledby="fn-group-title">
            <h2 id="fn-group-title" class="fn-panel-title">{{ groupTitle }}</h2>
            <div class="space-y-2 px-3 pb-3 pt-2">
              <slot name="group" />
            </div>
          </section>
          <div v-if="showGroup" class="mx-3 border-t border-outline-gray-2" role="separator" />
          <section aria-labelledby="fn-filter-title">
            <h2 id="fn-filter-title" class="fn-panel-title">{{ filterTitle }}</h2>
            <div class="space-y-3 px-3 pb-4 pt-2">
              <slot name="filters" />
            </div>
          </section>
        </div>
        <div class="border-t border-outline-gray-2 bg-surface-base p-3">
          <Button
            type="submit"
            variant="solid"
            theme="blue"
            size="md"
            class="fn-primary w-full"
            icon-left="lucide-search"
            label="Tìm kiếm"
            :loading="searching"
          />
        </div>
      </form>
    </aside>

    <main class="min-w-0 space-y-3 bg-surface-gray-1 px-5 pb-10 pt-4">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.fn-panel-resize {
  position: absolute;
  top: 0;
  right: -4px;
  bottom: 0;
  z-index: 5;
  width: 8px;
  cursor: col-resize;
  touch-action: none;
}
.fn-panel-resize:hover,
.fn-panel-resize:focus-visible {
  background: linear-gradient(to right, transparent 3px, theme('colors.fn.brand') 3px, theme('colors.fn.brand') 5px, transparent 5px);
  outline: none;
}
.fn-panel-title {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 14px 12px 6px;
  background: var(--surface-base);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-gray-5);
}
</style>
