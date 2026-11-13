<script setup lang="ts">
// Cây "Truy vấn nhóm": ô tìm kiếm ở TRÊN cây, mũi tên mở/thu từng nút, nút "Mở rộng tất cả"/"Thu gọn tất cả",
// checkbox chọn nhiều,
// cấp cha hiện trạng thái chọn một phần. v-model là danh sách key của các nút lá đang chọn.
import { computed, ref, watch } from 'vue'
import GroupTreeNode from './GroupTreeNode.vue'
import { filterTree, toggleNode, type TreeNode } from './tree'

const props = withDefaults(
  defineProps<{
    nodes: TreeNode[]
    searchPlaceholder?: string
    defaultExpandAll?: boolean
    /** Các nút mở sẵn khi vào màn (ví dụ năm hiện tại và các tháng của nó). Có thì không dùng defaultExpandAll. */
    defaultExpanded?: string[] | null
  }>(),
  { searchPlaceholder: 'Tìm trong nhóm', defaultExpandAll: true, defaultExpanded: null },
)
const model = defineModel<string[]>({ default: () => [] })
const query = ref('')

function allKeys(list: TreeNode[]): string[] {
  return list.flatMap((n) => (n.children?.length ? [n.key, ...allKeys(n.children)] : []))
}
function initialExpanded(n: TreeNode[]): Set<string> {
  if (props.defaultExpanded) return new Set(props.defaultExpanded)
  return new Set(props.defaultExpandAll ? allKeys(n) : [])
}
const expanded = ref<Set<string>>(initialExpanded(props.nodes))
// Dữ liệu cây tải lại (lọc, tìm kiếm) thì giữ các nút người dùng đang mở; chỉ lần đầu có dữ liệu mới áp mặc định.
let touched = false
watch(
  () => props.nodes,
  (n) => {
    if (!touched) expanded.value = initialExpanded(n)
  },
)
const allOpen = computed(() => {
  const keys = allKeys(props.nodes)
  return keys.length > 0 && keys.every((k) => expanded.value.has(k))
})
function expandAll() {
  touched = true
  expanded.value = new Set(allKeys(props.nodes))
}
function collapseAll() {
  touched = true
  expanded.value = new Set()
}

const visible = computed(() => filterTree(props.nodes, query.value))
const checked = computed(() => new Set(model.value))

function onToggleCheck(node: TreeNode) {
  model.value = [...toggleNode(node, checked.value)]
}
function onToggleExpand(key: string) {
  touched = true
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-1">
    <div class="relative min-w-0 flex-1">
      <span class="lucide-search pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-ink-gray-5" aria-hidden="true" />
      <input
        v-model="query"
        type="search"
        class="h-8 w-full rounded-4 border border-outline-gray-2 bg-surface-base pl-8 pr-2 text-base text-ink-gray-8 placeholder-ink-gray-4"
        :placeholder="searchPlaceholder"
        :aria-label="searchPlaceholder"
        @keydown.enter.prevent
      />
    </div>
    <button
      type="button"
      class="flex size-8 shrink-0 items-center justify-center rounded-4 text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-9"
      :aria-label="allOpen ? 'Thu gọn tất cả' : 'Mở rộng tất cả'"
      :title="allOpen ? 'Thu gọn tất cả' : 'Mở rộng tất cả'"
      @click="allOpen ? collapseAll() : expandAll()"
    >
      <span :class="allOpen ? 'lucide-chevrons-down-up' : 'lucide-chevrons-up-down'" class="size-4" aria-hidden="true" />
    </button>
    </div>
    <ul v-if="visible.length" role="tree" class="space-y-0.5">
      <GroupTreeNode
        v-for="node in visible"
        :key="node.key"
        :node="node"
        :level="0"
        :checked="checked"
        :expanded="query ? new Set(allKeys(visible)) : expanded"
        @toggle-check="onToggleCheck"
        @toggle-expand="onToggleExpand"
      />
    </ul>
    <p v-else class="px-1 text-sm text-ink-gray-5">Không có nhóm khớp từ khóa.</p>
  </div>
</template>
