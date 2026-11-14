<script setup lang="ts">
// Bố cục chia đôi của màn danh sách:
// - Panel trái 260px (người dùng kéo mép để giãn 220-480px, nút ⇤ ở tiêu đề để thu gọn thành dải hẹp),
//   cố định khi cuộn, cao bằng màn hình:
//   "Truy vấn nhóm" (ô tìm kiếm TRÊN cây, nửa trên, cuộn riêng) → vạch xanh đậm → "Truy vấn chi tiết" (các ô lọc,
//   nửa dưới, cuộn riêng). Tiêu đề chữ lớn, đậm. Nút "Tìm kiếm" rộng hết panel, cố định ở đáy. Enter trong ô lọc = Tìm kiếm.
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
// Thu gọn cả panel (để bảng rộng hơn): còn một dải hẹp có nút mở lại; nhớ trong trình duyệt.
const COLLAPSE_KEY = 'fn-split-panel-collapsed'
function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}
const collapsed = ref(loadCollapsed())
watch(collapsed, (v) => {
  try {
    localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0')
  } catch {
    /* bỏ qua */
  }
})
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
  <div class="grid min-h-[calc(100vh-3rem)]" :style="{ gridTemplateColumns: `${collapsed ? 44 : panelWidth}px minmax(0,1fr)` }">
    <aside
      v-if="collapsed"
      class="sticky top-12 flex h-[calc(100vh-3rem)] flex-col items-center gap-2 border-r border-outline-gray-2 bg-surface-base py-3"
      aria-label="Bộ lọc (đang thu gọn)"
    >
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-4 text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-9"
        aria-label="Mở panel bộ lọc"
        title="Mở panel bộ lọc"
        @click="collapsed = false"
      >
        <span class="lucide-panel-left-open size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="fn-rail-label text-sm-medium text-ink-gray-6 hover:text-ink-gray-9"
        @click="collapsed = false"
      >
        {{ showGroup ? groupTitle : filterTitle }}
      </button>
    </aside>
    <aside
      v-else
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
        <div class="flex min-h-0 flex-1 flex-col">
          <section v-if="showGroup" class="fn-panel-group" aria-labelledby="fn-group-title">
            <h2 id="fn-group-title" class="fn-panel-title fn-panel-title--group flex items-center justify-between">
              <span class="flex items-center gap-2"><span class="lucide-folder-tree size-4" aria-hidden="true" />{{ groupTitle }}</span>
              <button
                type="button"
                class="-my-1 flex size-7 items-center justify-center rounded-4 text-ink-gray-5 hover:bg-surface-gray-2 hover:text-ink-gray-9"
                aria-label="Thu gọn panel bộ lọc"
                title="Thu gọn panel bộ lọc"
                @click="collapsed = true"
              >
                <span class="lucide-panel-left-close size-4" aria-hidden="true" />
              </button>
            </h2>
            <div class="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3 pt-1">
              <slot name="group" />
            </div>
          </section>
          <section class="fn-panel-filters" :class="showGroup ? 'fn-panel-filters--split' : ''" aria-labelledby="fn-filter-title">
            <h2 id="fn-filter-title" class="fn-panel-title fn-panel-title--filter flex items-center justify-between">
              <span class="flex items-center gap-2"><span class="lucide-sliders-horizontal size-4" aria-hidden="true" />{{ filterTitle }}</span>
              <button
                v-if="!showGroup"
                type="button"
                class="-my-1 flex size-7 items-center justify-center rounded-4 text-ink-gray-5 hover:bg-surface-gray-2 hover:text-ink-gray-9"
                aria-label="Thu gọn panel bộ lọc"
                title="Thu gọn panel bộ lọc"
                @click="collapsed = true"
              >
                <span class="lucide-panel-left-close size-4" aria-hidden="true" />
              </button>
            </h2>
            <div class="space-y-3 px-3 pb-4 pt-2">
              <slot name="filters" />
            </div>
          </section>
        </div>
        <div class="fn-panel-foot p-3">
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
.fn-rail-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 12px;
}
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
/* Theo màn mẫu "Báo cáo chuyến": panel chia hai nửa, mỗi nửa cuộn riêng. "Truy vấn nhóm" ở trên (khoảng 44% chiều cao),
   "Truy vấn chi tiết" ở dưới, ngăn bằng vạch xanh đậm 2px; tiêu đề chữ lớn, đậm, dính khi cuộn. */
.fn-panel-title {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px 12px 8px;
  background: var(--surface-base);
  font-size: 16px;
  font-weight: 700;
  color: var(--ink-gray-9);
}
.fn-panel-title > span > span {
  color: theme('colors.fn.brand');
}
.fn-panel-title--filter {
  border-bottom: 1px solid #e3e8f0;
  margin-bottom: 8px;
}
.fn-panel-group {
  display: flex;
  flex-direction: column;
  flex: 1 1 44%;
  min-height: 0;
}
.fn-panel-filters {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 100%;
  overflow-y: auto;
}
.fn-panel-filters--split {
  flex: 1 1 56%;
  border-top: 2px solid theme('colors.fn.brand');
}
.fn-panel-foot {
  border-top: 1px solid #e3e8f0;
  background: var(--surface-base);
}
</style>
