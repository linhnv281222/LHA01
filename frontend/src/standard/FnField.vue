<script setup lang="ts">
// Ô nhập chuẩn: nhãn ở trên (danh từ), dấu * đỏ khi trường bắt buộc còn trống và chuyển đen khi đã điền,
// lỗi hiện ngay dưới ô (viền đỏ), nút xóa nhanh khi ô có giá trị, chọn từ danh sách có tìm kiếm và nút xóa.
// Không dùng placeholder thay nhãn.
// Ô mật khẩu (type="password"): nút ẩn/hiện có nhãn tiếng Việt, Tab tới được, không có nút xóa nhanh.
import { computed, ref } from 'vue'
import { Checkbox, Combobox, DatePicker, TextInput, Textarea } from 'frappe-ui'
import { formatNumber, parseNumber } from './format'
import { isEmpty } from './validation'
import type { SelectOption } from './types'

const props = withDefaults(
  defineProps<{
    /** Tên trường; dùng để focus ô lỗi (data-field). */
    field: string
    label: string
    type?: 'text' | 'number' | 'currency' | 'date' | 'select' | 'textarea' | 'checkbox' | 'password'
    required?: boolean
    error?: string
    hint?: string
    options?: SelectOption[]
    maxlength?: number
    disabled?: boolean
    readonly?: boolean
    rows?: number
    /** Đơn vị hiển thị sau ô số, ví dụ "VND", "ngày". */
    unit?: string
    /** Ẩn nhãn (vẫn đọc được bằng trình đọc màn hình). Dùng trong LineItems, nơi tiêu đề cột đã là nhãn. */
    hideLabel?: boolean
    /** Gợi ý tự điền của trình duyệt, ví dụ "username", "current-password", "new-password". */
    autocomplete?: string
  }>(),
  { hideLabel: false, type: 'text', required: false, error: '', hint: '', options: () => [], disabled: false, readonly: false, rows: 3, unit: '', autocomplete: undefined },
)
const model = defineModel<any>()
const emit = defineEmits<{ blur: [] }>()

const id = computed(() => `fn-field-${props.field}`)
const filled = computed(() => !isEmpty(model.value) && model.value !== false)
const describedBy = computed(() => [props.error ? `${id.value}-err` : '', props.hint ? `${id.value}-hint` : ''].filter(Boolean).join(' ') || undefined)

// Ô số/tiền: gõ tự do, khi rời ô thì định dạng 1.234.567
const numberText = ref<string | null>(null)
const numberDisplay = computed({
  get: () => numberText.value ?? (model.value === null || model.value === undefined ? '' : formatNumber(model.value)),
  set: (v: string) => {
    numberText.value = v
    model.value = parseNumber(v)
  },
})
function onNumberBlur() {
  numberText.value = null
  emit('blur')
}

// Ô mật khẩu: mặc định ẩn; bấm nút để hiện/ẩn.
const reveal = ref(false)

function clear() {
  model.value = props.type === 'number' || props.type === 'currency' ? null : ''
  numberText.value = null
}
</script>

<template>
  <div :data-field="field" :class="hideLabel ? 'space-y-1' : 'space-y-1.5'">
    <Checkbox
      v-if="type === 'checkbox'"
      :id="id"
      v-model="model"
      :label="hideLabel ? undefined : label"
      :aria-label="hideLabel ? label : undefined"
      :disabled="disabled || readonly"
      @update:model-value="emit('blur')"
    />
    <template v-else>
      <label :for="id" class="flex items-center gap-0.5 text-sm-medium text-ink-gray-7" :class="hideLabel ? 'sr-only' : ''">
        {{ label }}
        <span v-if="required" :class="filled ? 'text-ink-gray-9' : 'text-ink-red-6'" aria-hidden="true">*</span>
        <span v-if="required" class="sr-only">(bắt buộc)</span>
      </label>

      <div :class="[error ? 'fn-invalid' : '', type === 'select' ? 'fn-select' : '']">
        <Textarea
          v-if="type === 'textarea'"
          :id="id"
          v-model="model"
          variant="outline"
          :rows="rows"
          :disabled="disabled || readonly"
          :aria-invalid="!!error"
          :aria-describedby="describedBy"
          :maxlength="maxlength"
          @blur="emit('blur')"
        />
        <DatePicker
          v-else-if="type === 'date'"
          :id="id"
          v-model="model"
          variant="outline"
          format="DD/MM/YYYY"
          placeholder="Chọn ngày"
          :clearable="!readonly"
          :disabled="disabled || readonly"
          @update:model-value="emit('blur')"
        />
        <Combobox
          v-else-if="type === 'select'"
          :id="id"
          v-model="model"
          variant="outline"
          :options="options"
          :disabled="disabled || readonly"
          placeholder="Chọn"
          empty-text="Không có lựa chọn khớp"
          @update:model-value="emit('blur')"
        >
          <template #suffix>
            <button
              v-if="filled && !disabled && !readonly"
              type="button"
              class="mr-1 flex size-5 items-center justify-center rounded-3 text-ink-gray-5 hover:bg-surface-gray-3"
              :aria-label="`Xóa ${label}`"
              @click.stop="clear"
              @pointerdown.stop
            >
              <span class="lucide-x size-3.5" aria-hidden="true" />
            </button>
            <span v-else class="lucide-chevron-down mr-1 size-4 text-ink-gray-5" aria-hidden="true" />
          </template>
        </Combobox>
        <TextInput
          v-else-if="type === 'number' || type === 'currency'"
          :id="id"
          v-model="numberDisplay"
          type="text"
          inputmode="decimal"
          variant="outline"
          class="text-right tabular-nums"
          :disabled="disabled || readonly"
          :aria-invalid="!!error"
          :aria-describedby="describedBy"
          @blur="onNumberBlur"
        >
          <template #suffix>
            <button
              v-if="filled && !disabled && !readonly"
              type="button"
              class="flex size-5 items-center justify-center rounded-3 text-ink-gray-5 hover:bg-surface-gray-3"
              :aria-label="`Xóa ${label}`"
              @click="clear"
            >
              <span class="lucide-x size-3.5" aria-hidden="true" />
            </button>
            <span v-if="unit" class="ml-1 text-sm text-ink-gray-5">{{ unit }}</span>
          </template>
        </TextInput>
        <TextInput
          v-else-if="type === 'password'"
          :id="id"
          v-model="model"
          :type="reveal ? 'text' : 'password'"
          variant="outline"
          :maxlength="maxlength"
          :autocomplete="autocomplete ?? 'current-password'"
          :disabled="disabled || readonly"
          :aria-invalid="!!error"
          :aria-describedby="describedBy"
          @blur="emit('blur')"
        >
          <template #suffix>
            <button
              type="button"
              class="flex size-6 items-center justify-center rounded-3 text-ink-gray-5 hover:bg-surface-gray-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-outline-blue-3"
              :aria-label="reveal ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              :aria-pressed="reveal"
              :disabled="disabled"
              @click="reveal = !reveal"
            >
              <span :class="reveal ? 'lucide-eye-off' : 'lucide-eye'" class="size-4" aria-hidden="true" />
            </button>
          </template>
        </TextInput>
        <TextInput
          v-else
          :id="id"
          v-model="model"
          type="text"
          variant="outline"
          :maxlength="maxlength"
          :autocomplete="autocomplete"
          :disabled="disabled || readonly"
          :aria-invalid="!!error"
          :aria-describedby="describedBy"
          @blur="emit('blur')"
        >
          <template v-if="filled && !disabled && !readonly" #suffix>
            <button
              type="button"
              class="flex size-5 items-center justify-center rounded-3 text-ink-gray-5 hover:bg-surface-gray-3"
              :aria-label="`Xóa ${label}`"
              @click="clear"
            >
              <span class="lucide-x size-3.5" aria-hidden="true" />
            </button>
          </template>
        </TextInput>
      </div>
    </template>

    <p v-if="error" :id="`${id}-err`" class="flex items-center gap-1 text-sm text-ink-red-7" role="alert">
      <span class="lucide-circle-alert size-3.5 shrink-0" aria-hidden="true" />{{ error }}
    </p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-sm text-ink-gray-5">{{ hint }}</p>
  </div>
</template>

<style scoped>
/* Mọi loại ô rộng bằng nhau trong lưới form (Combobox mặc định chỉ rộng theo nội dung). */
.fn-select :deep([data-slot='trigger']) {
  display: flex;
  width: 100%;
}
.fn-invalid :deep(input),
.fn-invalid :deep(textarea),
.fn-invalid.fn-select :deep([data-slot='trigger']),
.fn-invalid :deep([data-slot='control']) {
  border-color: var(--outline-red-3) !important;
  box-shadow: 0 0 0 1px var(--outline-red-3);
}
/* Ô gõ nằm trong khung chọn: viền đỏ đã có ở khung, không vẽ thêm viền cho ô gõ bên trong. */
.fn-invalid.fn-select :deep([data-slot='trigger'] input) {
  border: 0 !important;
  box-shadow: none !important;
}
</style>
