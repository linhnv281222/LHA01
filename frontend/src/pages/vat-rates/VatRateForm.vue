<script setup lang="ts">
// Form thêm mới / cập nhật Thuế suất, theo mẫu ContractTypeForm.vue.
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Alert, LoadingText, toast, useDoc, useDoctype } from 'frappe-ui'
import { FnField, FormPage, FormSection, PrimaryButton, serverErrorMessage, useFormValidation } from '@/standard'
import { DOCTYPE, FORM_RULES, applyNonTaxable, emptyForm, toPayload, type VatRate } from './vatRate'

const props = defineProps<{ name?: string }>()
const router = useRouter()
const isEdit = computed(() => !!props.name)

const form = reactive(emptyForm())
const saved = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== saved.value)
const { errors, validateField, validateAll } = useFormValidation(form, FORM_RULES)
const serverError = ref('')
const page = ref<InstanceType<typeof FormPage> | null>(null)

const doc = isEdit.value ? useDoc<VatRate>({ doctype: DOCTYPE, name: props.name as string }) : null
watch(
  () => doc?.doc,
  (d) => {
    if (!d) return
    Object.assign(form, {
      rate_name: d.rate_name,
      rate: Number(d.rate) || 0,
      is_non_taxable: !!d.is_non_taxable,
      is_active: !!d.is_active,
    })
    saved.value = JSON.stringify(form)
  },
  { immediate: true },
)

// Tích "Không chịu thuế" thì tỷ lệ về 0 và ô tỷ lệ bị khóa.
watch(
  () => form.is_non_taxable,
  () => {
    applyNonTaxable(form)
    delete errors.rate
  },
)

const writes = useDoctype<VatRate>(DOCTYPE)
const saving = computed(() => writes.insert.loading || writes.setValue.loading)

async function save() {
  serverError.value = ''
  if (saving.value) return
  if (!validateAll()) return
  try {
    const payload = toPayload(form)
    const result = isEdit.value
      ? await writes.setValue.submit({ name: props.name as string, ...payload })
      : await writes.insert.submit(payload)
    if (!result) throw writes.insert.error ?? writes.setValue.error ?? new Error('')
    toast.success(isEdit.value ? `Đã cập nhật thuế suất ${payload.rate_name}.` : `Đã thêm thuế suất ${payload.rate_name}.`)
    page.value?.allowLeave()
    await router.push({ path: '/vat-rates', query: { selected: result.name } })
  } catch (err) {
    serverError.value = serverErrorMessage(err)
    toast.error('Chưa lưu được. Xem thông báo lỗi phía trên form.')
  }
}
</script>

<template>
  <FormPage
    ref="page"
    :title="isEdit ? 'Cập nhật thuế suất' : 'Thêm thuế suất'"
    :subtitle="isEdit ? name : ''"
    back-to="/vat-rates"
    :dirty="dirty"
    @submit="save"
  >
    <LoadingText v-if="doc && doc.loading && !doc.doc" text="Đang tải dữ liệu…" />
    <Alert v-else-if="doc?.error" theme="red" title="Không tải được bản ghi" :description="serverErrorMessage(doc.error)" />
    <template v-else>
      <Alert v-if="serverError" theme="red" title="Chưa lưu được" :description="serverError" />

      <FormSection title="Thông tin chung">
        <FnField
          v-model="form.rate_name"
          field="rate_name"
          label="Tên thuế suất"
          required
          :maxlength="100"
          :disabled="isEdit"
          :error="errors.rate_name"
          hint="Không đổi được sau khi lưu."
          @blur="validateField('rate_name')"
        />
        <FnField
          v-model="form.rate"
          field="rate"
          label="Tỷ lệ"
          type="number"
          unit="%"
          required
          :disabled="form.is_non_taxable"
          :error="errors.rate"
          @blur="validateField('rate')"
        />
        <FnField v-model="form.is_non_taxable" field="is_non_taxable" label="Không chịu thuế" type="checkbox" />
        <FnField v-model="form.is_active" field="is_active" label="Đang dùng" type="checkbox" />
      </FormSection>
    </template>

    <template #actions>
      <PrimaryButton type="submit" icon-left="lucide-save" label="Lưu" :loading="saving" :disabled="saving" />
    </template>
  </FormPage>
</template>
