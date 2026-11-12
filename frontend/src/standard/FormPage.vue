<script setup lang="ts">
// Trang form thêm mới / cập nhật (form > 5 ô thì làm trang, không làm popup):
// - nút quay lại danh sách ở trên; focus ô đầu tiên khi mở
// - thanh nút cố định ở đáy: "Hủy" (trung tính, bên trái) — các nút chính (bên phải, động từ cụ thể)
// - slot "summary": số tổng cập nhật khi nhập (ví dụ Trước thuế · Thuế · Sau thuế), nằm trước các nút chính
// - các khối (FormSection) đặt thẳng trong slot mặc định, hoặc bọc trong div có class space-y-4 (không dùng class contents)
// - Enter = nút chính (form submit); rời trang khi có thay đổi chưa lưu thì hỏi xác nhận
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { Button, dialog } from 'frappe-ui'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    /** Đường dẫn danh sách để quay lại. */
    backTo: string
    backLabel?: string
    /** Có thay đổi chưa lưu. */
    dirty?: boolean
  }>(),
  { subtitle: '', backLabel: 'Quay lại danh sách', dirty: false },
)
const emit = defineEmits<{ submit: [] }>()
const router = useRouter()
const formEl = ref<HTMLFormElement | null>(null)
let leaving = false

function confirmLeave(): Promise<boolean> {
  return new Promise((resolve) => {
    dialog.confirm({
      title: 'Bỏ thay đổi?',
      message: 'Các thông tin vừa nhập chưa được lưu sẽ bị mất.',
      confirmLabel: 'Bỏ thay đổi',
      cancelLabel: 'Tiếp tục nhập',
      theme: 'red',
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
}

onBeforeRouteLeave(async () => {
  if (!props.dirty || leaving) return true
  return await confirmLeave()
})

/** Gọi sau khi lưu thành công, để rời trang mà không hỏi lại. */
function allowLeave() {
  leaving = true
}
defineExpose({ allowLeave })

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (props.dirty && !leaving) e.preventDefault()
}

onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload)
  const first = formEl.value?.querySelector<HTMLElement>('input:not([disabled]):not([type=hidden]), textarea:not([disabled])')
  first?.focus()
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

function cancel() {
  void router.push(props.backTo)
}
</script>

<template>
  <form ref="formEl" class="min-h-[calc(100vh-3rem)] bg-surface-gray-1 pb-24" novalidate @submit.prevent="emit('submit')">
    <div class="mx-auto max-w-[1200px] space-y-4 px-5 pt-4">
      <div class="space-y-1">
        <RouterLink :to="backTo" class="inline-flex items-center gap-1 text-base text-ink-blue-link hover:underline">
          <span class="lucide-arrow-left size-4" aria-hidden="true" />{{ backLabel }}
        </RouterLink>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl-semibold text-ink-gray-9">{{ title }}</h1>
          <span v-if="subtitle" class="text-base text-ink-gray-5">{{ subtitle }}</span>
        </div>
      </div>
      <slot />
    </div>

    <footer class="fixed inset-x-0 bottom-0 z-20 border-t border-outline-gray-2 bg-surface-base shadow-[0_-2px_8px_rgb(0_0_0/0.06)]">
      <div class="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-5 py-3">
        <Button size="md" variant="outline" label="Hủy" @click="cancel" />
        <div class="flex items-center gap-5">
          <div v-if="$slots.summary" class="flex items-baseline gap-5 text-base text-ink-gray-6 tabular-nums">
            <slot name="summary" />
          </div>
          <div class="flex items-center gap-2">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </footer>
  </form>
</template>
