<script setup lang="ts">
// Bố cục chia đôi của màn danh sách:
// - Panel trái 260px (người dùng kéo mép để giãn 220-480px, nút ⇤ ở tiêu đề để thu gọn thành dải hẹp),
//   cố định khi cuộn, cao bằng màn hình:
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
        <div class="min-h-0 flex-1 overflow-y-auto">
          <section v-if="showGroup" aria-labelledby="fn-group-title">
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
            <div class="space-y-2 px-3 pb-3 pt-2">
              <slot name="group" />
            </div>
          </section>
          <div v-if="showGroup" class="fn-panel-gap" role="separator" />
          <section class="fn-panel-filters" aria-labelledby="fn-filter-title">
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
/* Hai khối lọc phân biệt rõ: "Truy vấn nhóm" tông xanh dương, nền trắng; "Truy vấn chi tiết" tông xanh ngọc, nền xám
   nhạt để các ô nhập nổi lên; giữa hai khối là một dải ngăn dày. Tiêu đề là dải màu có vạch trái, dính khi cuộn. */
.fn-panel-title {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 9px 10px 9px 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  box-shadow: inset 4px 0 0 var(--fn-p-bar), inset 0 -1px 0 var(--fn-p-line);
  background: var(--fn-p-bg);
  color: var(--fn-p-ink);
}
.fn-panel-title--group {
  --fn-p-bg: #e3edf8;
  --fn-p-bar: #1d5fa8;
  --fn-p-ink: #123e70;
  --fn-p-line: #c9daee;
}
.fn-panel-title--filter {
  --fn-p-bg: #dff1ec;
  --fn-p-bar: #0f766e;
  --fn-p-ink: #0b4f4a;
  --fn-p-line: #c3e3da;
}
.fn-panel-gap {
  height: 10px;
  background: #e6eaf0;
  border-top: 1px solid var(--outline-gray-2);
  border-bottom: 1px solid var(--outline-gray-2);
}
.fn-panel-filters {
  background: #f6f8fa;
  min-height: 100%;
}
.fn-panel-foot {
  border-top: 1px solid var(--outline-gray-2);
  background: #f6f8fa;
}
</style>
