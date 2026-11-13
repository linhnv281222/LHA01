<script setup lang="ts">
import { computed } from 'vue'
import { checkState, type TreeNode } from './tree'

const props = defineProps<{ node: TreeNode; level: number; checked: Set<string>; expanded: Set<string> }>()
const emit = defineEmits<{ toggleCheck: [node: TreeNode]; toggleExpand: [key: string] }>()

const LEVEL_ICONS = ['lucide-building-2', 'lucide-folder', 'lucide-file-text']
const state = computed(() => checkState(props.node, props.checked))
const hasChildren = computed(() => !!props.node.children?.length)
const isOpen = computed(() => props.expanded.has(props.node.key))
const icon = computed(() => props.node.icon ?? LEVEL_ICONS[Math.min(props.level, LEVEL_ICONS.length - 1)])
// Ô icon có nền nhạt theo tone để nhìn là biết cấp (năm / tháng / đối tác / chứng từ). Lớp viết đủ để Tailwind sinh.
const TONE_CHIP: Record<string, string> = {
  blue: 'bg-surface-blue-2 text-ink-blue-7',
  violet: 'bg-surface-violet-2 text-ink-violet-7',
  amber: 'bg-surface-amber-2 text-ink-amber-7',
  green: 'bg-surface-green-2 text-ink-green-7',
  teal: 'bg-surface-teal-2 text-ink-teal-7',
  orange: 'bg-surface-orange-2 text-ink-orange-7',
  gray: 'bg-surface-gray-2 text-ink-gray-6',
}
</script>

<template>
  <li role="treeitem" :aria-expanded="hasChildren ? isOpen : undefined" :aria-checked="state === 'partial' ? 'mixed' : state === 'checked'">
    <div class="flex min-h-7 items-center gap-1 rounded-4 pr-1 hover:bg-surface-gray-2" :style="{ paddingLeft: `${level * 12}px` }">
      <button
        v-if="hasChildren"
        type="button"
        class="flex size-6 shrink-0 items-center justify-center rounded-3 text-ink-gray-5 hover:bg-surface-gray-3 hover:text-ink-gray-8"
        :aria-label="isOpen ? `Thu gọn ${node.label}` : `Mở rộng ${node.label}`"
        @click="emit('toggleExpand', node.key)"
      >
        <!-- Mũi tên như cây thư mục: chỉ sang phải khi đóng, xoay xuống khi mở. -->
        <span
          class="lucide-chevron-right size-4 transition-transform duration-150 motion-reduce:transition-none"
          :class="isOpen ? 'rotate-90' : ''"
          aria-hidden="true"
        />
      </button>
      <span v-else class="w-6 shrink-0" />
      <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 text-base text-ink-gray-8">
        <input
          type="checkbox"
          class="size-4 shrink-0 accent-[#1D5FA8]"
          :checked="state === 'checked'"
          :indeterminate="state === 'partial'"
          @change="emit('toggleCheck', node)"
        />
        <span
          v-if="node.tone"
          class="flex size-5 shrink-0 items-center justify-center rounded-4"
          :class="TONE_CHIP[node.tone]"
          aria-hidden="true"
        >
          <span :class="icon" class="size-3.5" />
        </span>
        <span v-else :class="icon" class="size-4 shrink-0 text-fn-brand" aria-hidden="true" />
        <span class="truncate" :class="node.strong ? 'font-semibold text-ink-gray-9' : ''" :title="node.title ?? node.label">{{ node.label }}</span>
        <span v-if="node.count !== undefined" class="ml-auto text-sm tabular-nums text-ink-gray-5">{{ node.count }}</span>
      </label>
    </div>
    <ul v-if="hasChildren && isOpen" role="group">
      <GroupTreeNode
        v-for="child in node.children"
        :key="child.key"
        :node="child"
        :level="level + 1"
        :checked="checked"
        :expanded="expanded"
        @toggle-check="(n) => emit('toggleCheck', n)"
        @toggle-expand="(k) => emit('toggleExpand', k)"
      />
    </ul>
  </li>
</template>
