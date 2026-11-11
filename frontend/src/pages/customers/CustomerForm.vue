<script setup lang="ts">
// Form thêm mới / cập nhật Khách hàng, theo mẫu ContractTypeForm.vue.
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Alert, LoadingText, toast, useDoc, useDoctype } from 'frappe-ui'
import { FnField, FormPage, FormSection, PrimaryButton, serverErrorMessage, useFormValidation } from '@/standard'
import { DOCTYPE, FORM_RULES, emptyForm, toPayload, type ContractCustomer } from './customer'

const props = defineProps<{ name?: string }>()
const router = useRouter()
const isEdit = computed(() => !!props.name)

const form = reactive(emptyForm())
const saved = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== saved.value)
const { errors, validateField, validateAll } = useFormValidation(form, FORM_RULES)
const serverError = ref('')
const page = ref<InstanceType<typeof FormPage> | null>(null)

const doc = isEdit.value ? useDoc<ContractCustomer>({ doctype: DOCTYPE, name: props.name as string }) : null
watch(
  () => doc?.doc,
  (d) => {
    if (!d) return
    const next = emptyForm()
    for (const key of Object.keys(next) as (keyof typeof next)[]) next[key] = (d[key] as string | null) ?? ''
    Object.assign(form, next)
    saved.value = JSON.stringify(form)
  },
  { immediate: true },
)

const writes = useDoctype<ContractCustomer>(DOCTYPE)
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
    toast.success(isEdit.value ? `Đã cập nhật khách hàng ${result.name}.` : `Đã thêm khách hàng ${result.name}.`)
    page.value?.allowLeave()
    await router.push({ path: '/customers', query: { selected: result.name } })
  } catch (err) {
    serverError.value = serverErrorMessage(err)
    toast.error('Chưa lưu được. Xem thông báo lỗi phía trên form.')
  }
}
</script>

<template>
  <FormPage
    ref="page"
    :title="isEdit ? 'Cập nhật khách hàng' : 'Thêm khách hàng'"
    :subtitle="isEdit ? name : ''"
    back-to="/customers"
    :dirty="dirty"
    @submit="save"
  >
    <LoadingText v-if="doc && doc.loading && !doc.doc" text="Đang tải dữ liệu…" />
    <Alert v-else-if="doc?.error" theme="red" title="Không tải được bản ghi" :description="serverErrorMessage(doc.error)" />
    <template v-else>
      <Alert v-if="serverError" theme="red" title="Chưa lưu được" :description="serverError" />

      <FormSection title="Thông tin chung">
        <FnField
          v-model="form.customer_name"
          field="customer_name"
          label="Tên khách hàng"
          required
          :maxlength="140"
          :error="errors.customer_name"
          @blur="validateField('customer_name')"
        />
        <FnField
          v-model="form.tax_code"
          field="tax_code"
          label="Mã số thuế"
          :maxlength="20"
          :error="errors.tax_code"
          @blur="validateField('tax_code')"
        />
        <FnField
          v-model="form.address"
          field="address"
          label="Địa chỉ"
          type="textarea"
          :rows="2"
          :maxlength="1000"
          :error="errors.address"
          @blur="validateField('address')"
        />
      </FormSection>

      <FormSection title="Liên hệ">
        <FnField
          v-model="form.contact_person"
          field="contact_person"
          label="Người liên hệ"
          :maxlength="140"
          :error="errors.contact_person"
          @blur="validateField('contact_person')"
        />
        <FnField
          v-model="form.representative_title"
          field="representative_title"
          label="Chức vụ người đại diện"
          :maxlength="140"
          :error="errors.representative_title"
          @blur="validateField('representative_title')"
        />
        <FnField v-model="form.phone" field="phone" label="Số điện thoại" :error="errors.phone" @blur="validateField('phone')" />
        <FnField v-model="form.email" field="email" label="Email" :error="errors.email" @blur="validateField('email')" />
      </FormSection>

      <FormSection title="Tài khoản ngân hàng" muted>
        <FnField
          v-model="form.bank_account"
          field="bank_account"
          label="Số tài khoản"
          :maxlength="140"
          :error="errors.bank_account"
          @blur="validateField('bank_account')"
        />
        <FnField
          v-model="form.bank_name"
          field="bank_name"
          label="Ngân hàng"
          :maxlength="140"
          :error="errors.bank_name"
          @blur="validateField('bank_name')"
        />
      </FormSection>

      <FormSection title="Ghi chú" muted :columns="1">
        <FnField
          v-model="form.notes"
          field="notes"
          label="Ghi chú"
          type="textarea"
          :rows="4"
          :maxlength="1000"
          :error="errors.notes"
          @blur="validateField('notes')"
        />
      </FormSection>
    </template>

    <template #actions>
      <PrimaryButton type="submit" icon-left="lucide-save" label="Lưu" :loading="saving" :disabled="saving" />
    </template>
  </FormPage>
</template>
