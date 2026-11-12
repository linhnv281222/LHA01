<script setup lang="ts">
// Bố cục chia đôi của màn danh sách:
// - Panel trái 260px, cố định khi cuộn, cao bằng màn hình:
//   "Truy vấn nhóm" (ô tìm kiếm TRÊN cây) → kẻ ngang → "Truy vấn chi tiết" (các ô lọc).
//   Hai tiêu đề dính (sticky). Nút "Tìm kiếm" rộng hết panel, cố định ở đáy. Enter trong ô lọc = Tìm kiếm.
// - Vùng phải: tiêu đề trang, thẻ số liệu, bảng, chi tiết dòng chọn (do trang tự đặt vào slot mặc định).
import { Button } from 'frappe-ui'

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
  <div class="grid min-h-[calc(100vh-3rem)] grid-cols-[260px_minmax(0,1fr)]">
    <aside
      class="sticky top-12 flex h-[calc(100vh-3rem)] flex-col border-r border-outline-gray-2 bg-surface-base"
      aria-label="Bộ lọc"
    >
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
