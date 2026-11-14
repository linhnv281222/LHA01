<script setup lang="ts">
// Nút thao tác có màu theo LOẠI hành động, để người dùng nhận ra bằng mắt trước khi đọc chữ:
//   create  thêm mới (nền xanh đậm, dùng PrimaryButton cho nút chính duy nhất của màn)
//   next    bước tiếp theo trong luồng chứng từ (Tạo đề nghị thanh toán, Ghi nhận hóa đơn, Ghi nhận thu tiền)
//   edit    sửa / cập nhật
//   export  xuất Excel, tải file
//   print   in
//   approve duyệt, ghi, kích hoạt
//   danger  hủy, xóa
//   neutral còn lại
// iconOnly: nút vuông chỉ có biểu tượng (cột Thao tác trong bảng); bắt buộc có label để làm aria-label và tooltip.
import { computed } from 'vue'
import { useRouter } from 'vue-router'

type Kind = 'create' | 'next' | 'edit' | 'export' | 'print' | 'approve' | 'danger' | 'neutral'

const props = withDefaults(
  defineProps<{
    kind?: Kind
    label: string
    icon?: string
    iconOnly?: boolean
    loading?: boolean
    disabled?: boolean
    route?: string
    size?: 'sm' | 'md'
  }>(),
  { kind: 'neutral', icon: '', iconOnly: false, loading: false, disabled: false, route: '', size: 'md' },
)
const emit = defineEmits<{ click: [e: MouseEvent] }>()
const router = useRouter()

const DEFAULT_ICON: Record<Kind, string> = {
  create: 'lucide-plus',
  next: 'lucide-arrow-right-circle',
  edit: 'lucide-pencil',
  export: 'lucide-file-spreadsheet',
  print: 'lucide-printer',
  approve: 'lucide-check-circle',
  danger: 'lucide-trash-2',
  neutral: '',
}
const iconClass = computed(() => props.icon || DEFAULT_ICON[props.kind])

function onClick(e: MouseEvent) {
  if (props.disabled || props.loading) return
  if (props.route) {
    e.stopPropagation() // trong dòng bảng: không chọn dòng khi bấm nút chuyển trang
    router.push(props.route)
  }
  emit('click', e)
}
</script>

<template>
  <button
    type="button"
    class="fn-act inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap font-medium"
    :class="[
      `fn-act--${kind}`,
      iconOnly ? (size === 'sm' ? 'size-7' : 'size-8') : size === 'sm' ? 'h-7 px-2.5 text-sm' : 'h-8 px-3 text-base',
    ]"
    :disabled="disabled || loading"
    :aria-label="iconOnly ? label : undefined"
    :title="iconOnly ? label : undefined"
    :aria-busy="loading || undefined"
    @click="onClick"
  >
    <span v-if="loading" class="lucide-loader-circle size-4 animate-spin" aria-hidden="true" />
    <span v-else-if="iconClass" :class="iconClass" class="size-4" aria-hidden="true" />
    <span v-if="!iconOnly">{{ label }}</span>
  </button>
</template>

<style scoped>
.fn-act {
  border-radius: 8px;
  border: 1px solid var(--fn-a-line);
  background: var(--fn-a-bg);
  color: var(--fn-a-ink);
  transition: background-color 0.12s, border-color 0.12s;
}
.fn-act:hover:not(:disabled) {
  background: var(--fn-a-hover);
  border-color: var(--fn-a-ink);
}
.fn-act:focus-visible {
  outline: 2px solid var(--fn-a-ink);
  outline-offset: 2px;
}
.fn-act:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.fn-act--create {
  --fn-a-bg: #1d5fa8;
  --fn-a-hover: #174c86;
  --fn-a-line: #1d5fa8;
  --fn-a-ink: #fff;
}
.fn-act--create:hover:not(:disabled) {
  border-color: #174c86;
}
.fn-act--next {
  --fn-a-bg: #f1edfb;
  --fn-a-hover: #e5ddf7;
  --fn-a-line: #d3c6f1;
  --fn-a-ink: #5b3fb0;
}
.fn-act--edit {
  --fn-a-bg: #fdf6e7;
  --fn-a-hover: #faebc9;
  --fn-a-line: #f1d79f;
  --fn-a-ink: #a14a06;
}
.fn-act--export {
  --fn-a-bg: #ecf8f1;
  --fn-a-hover: #d9f1e3;
  --fn-a-line: #b6e2c7;
  --fn-a-ink: #15803d;
}
.fn-act--print {
  --fn-a-bg: #eef4fb;
  --fn-a-hover: #dde9f7;
  --fn-a-line: #c3d7ef;
  --fn-a-ink: #1d5fa8;
}
.fn-act--approve {
  --fn-a-bg: #16a34a;
  --fn-a-hover: #15803d;
  --fn-a-line: #16a34a;
  --fn-a-ink: #fff;
}
.fn-act--approve:hover:not(:disabled) {
  border-color: #15803d;
}
.fn-act--danger {
  --fn-a-bg: #fdefef;
  --fn-a-hover: #fadcdc;
  --fn-a-line: #f3c2c2;
  --fn-a-ink: #b91c1c;
}
.fn-act--neutral {
  --fn-a-bg: #fff;
  --fn-a-hover: #f3f5f8;
  --fn-a-line: #d6dbe2;
  --fn-a-ink: #374151;
}
</style>
