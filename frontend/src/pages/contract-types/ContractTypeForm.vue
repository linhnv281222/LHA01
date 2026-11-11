<script setup lang="ts">
// Form mẫu thêm mới / cập nhật theo chuẩn: trang riêng, nhóm thông tin rõ ràng, thanh nút cố định ở đáy,
// kiểm tra ngay trên trình duyệt (sai thì không gửi request), báo kết quả, sau khi lưu quay về danh sách
// và chọn sẵn dòng vừa lưu.
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Alert, LoadingText, toast, useDoc, useDoctype } from 'frappe-ui'
import { FnField, FormPage, FormSection, PrimaryButton, serverErrorMessage, useFormValidation } from '@/standard'
import { DOCTYPE, FORM_RULES, emptyForm, toPayload, type ContractType } from './contractType'

const props = defineProps<{ name?: string }>()
const router = useRouter()
const isEdit = computed(() => !!props.name)

const form = reactive(emptyForm())
const saved = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== saved.value)
const { errors, validateField, validateAll } = useFormValidation(form, FORM_RULES)
const serverError = ref('')
const page = ref<InstanceType<typeof FormPage> | null>(null)

// Chế độ cập nhật: tải bản ghi rồi đổ vào form.
const doc = isEdit.value ? useDoc<ContractType>({ doctype: DOCTYPE, name: props.name as string }) : null
watch(
  () => doc?.doc,
  (d) => {
    if (!d) return
    Object.assign(form, {
      code: d.code,
      type_name: d.type_name,
      is_active: !!d.is_active,
      description: d.description ?? '',
    })
    saved.value = JSON.stringify(form)
  },
  { immediate: true },
)

const writes = useDoctype<ContractType>(DOCTYPE)
const saving = computed(() => writes.insert.loading || writes.setValue.loading)

async function save() {
  serverError.value = ''
  if (saving.value) return // chống bấm hai lần
  if (!validateAll()) return // sai thì không gửi request
  try {
    const payload = toPayload(form)
    const result = isEdit.value
      ? await writes.setValue.submit({ name: props.name as string, ...payload })
      : await writes.insert.submit(payload)
    if (!result) throw writes.insert.error ?? writes.setValue.error ?? new Error('')
    toast.success(isEdit.value ? `Đã cập nhật loại hợp đồng ${payload.code}.` : `Đã thêm loại hợp đồng ${payload.code}.`)
    page.value?.allowLeave()
    await router.push({ path: '/contract-types', query: { selected: result.name } })
  } catch (err) {
    serverError.value = serverErrorMessage(err)
    toast.error('Chưa lưu được. Xem thông báo lỗi phía trên form.')
  }
}
</script>

<template>
  <FormPage
    ref="page"
    :title="isEdit ? 'Cập nhật loại hợp đồng' : 'Thêm loại hợp đồng'"
    :subtitle="isEdit ? name : ''"
    back-to="/contract-types"
    :dirty="dirty"
    @submit="save"
  >
    <LoadingText v-if="doc && doc.loading && !doc.doc" text="Đang tải dữ liệu…" />
    <Alert v-else-if="doc?.error" theme="red" title="Không tải được bản ghi" :description="serverErrorMessage(doc.error)" />
    <template v-else>
      <Alert v-if="serverError" theme="red" title="Chưa lưu được" :description="serverError" />

      <FormSection title="Thông tin chung">
        <FnField
          v-model="form.code"
          field="code"
          label="Mã"
          required
          :maxlength="20"
          :disabled="isEdit"
          :error="errors.code"
          hint="Chữ in hoa, chữ số, dấu gạch dưới. Không đổi được sau khi lưu."
          @blur="validateField('code')"
        />
        <FnField
          v-model="form.type_name"
          field="type_name"
          label="Tên loại hợp đồng"
          required
          :maxlength="140"
          :error="errors.type_name"
          @blur="validateField('type_name')"
        />
        <FnField v-model="form.is_active" field="is_active" label="Đang dùng" type="checkbox" />
      </FormSection>

      <FormSection title="Mô tả" description="Thông tin phụ, không bắt buộc." muted :columns="1">
        <FnField
          v-model="form.description"
          field="description"
          label="Mô tả"
          type="textarea"
          :rows="4"
          :maxlength="1000"
          :error="errors.description"
          @blur="validateField('description')"
        />
      </FormSection>
    </template>

    <template #actions>
      <PrimaryButton type="submit" icon-left="lucide-save" label="Lưu" :loading="saving" :disabled="saving" />
    </template>
  </FormPage>
</template>
