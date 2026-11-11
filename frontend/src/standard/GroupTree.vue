<script setup lang="ts">
// Cây "Truy vấn nhóm": ô tìm kiếm ở TRÊN cây, nút −/+ thu gọn, checkbox chọn nhiều,
// cấp cha hiện trạng thái chọn một phần. v-model là danh sách key của các nút lá đang chọn.
import { computed, ref, watch } from 'vue'
import GroupTreeNode from './GroupTreeNode.vue'
import { filterTree, toggleNode, type TreeNode } from './tree'

const props = withDefaults(defineProps<{ nodes: TreeNode[]; searchPlaceholder?: string; defaultExpandAll?: boolean }>(), {
  searchPlaceholder: 'Tìm trong nhóm',
  defaultExpandAll: true,
})
const model = defineModel<string[]>({ default: () => [] })
const query = ref('')

function allKeys(list: TreeNode[]): string[] {
  return list.flatMap((n) => (n.children?.length ? [n.key, ...allKeys(n.children)] : []))
}
const expanded = ref<Set<string>>(new Set(props.defaultExpandAll ? allKeys(props.nodes) : []))
watch(
  () => props.nodes,
  (n) => {
    if (props.defaultExpandAll) expanded.value = new Set(allKeys(n))
  },
)

const visible = computed(() => filterTree(props.nodes, query.value))
const checked = computed(() => new Set(model.value))

function onToggleCheck(node: TreeNode) {
  model.value = [...toggleNode(node, checked.value)]
}
function onToggleExpand(key: string) {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}
</script>

<template>
  <div class="space-y-2">
    <div class="relative">
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
