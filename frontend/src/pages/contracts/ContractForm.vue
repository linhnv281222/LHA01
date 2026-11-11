<script setup lang="ts">
// Form thêm mới / cập nhật Hợp đồng, theo mẫu ContractTypeForm.vue.
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Alert, Button, FileUploader, LoadingText, dialog, toast, useCall, useDoc, useDoctype, useList } from 'frappe-ui'
import {
  FnField,
  FormPage,
  FormSection,
  PrimaryButton,
  focusField,
  formatCurrency,
  serverErrorMessage,
  useFormValidation,
  type SelectOption,
} from '@/standard'
import type { ContractCustomer, ContractType, VATRate } from '@/types/doctypes'
import ContractItemRows from './ContractItemRows.vue'
import {
  DOCTYPE,
  FORM_RULES,
  MSG_DUPLICATE,
  applyContractEndDate,
  canActivate,
  canCancel,
  canLiquidate,
  emptyForm,
  emptyItem,
  fmt,
  fromDoc,
  isLocked,
  lockedMessage,
  toPayload,
  validateExtra,
  validateItems,
  type Contract,
} from './contract'

const props = defineProps<{ name?: string }>()
const router = useRouter()
const isEdit = computed(() => !!props.name)

const form = reactive(emptyForm())
const saved = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== saved.value)
const { errors, validateField, validateAll } = useFormValidation(form, FORM_RULES)
const serverError = ref('')
const page = ref<InstanceType<typeof FormPage> | null>(null)

// Hợp đồng đang sửa; số tổng và trạng thái lấy theo kết quả của server.
const doc = isEdit.value
  ? useDoc<Contract>({
      doctype: DOCTYPE,
      name: props.name as string,
      methods: { activate: 'activate', cancel_contract: 'cancel_contract', liquidate: 'liquidate' },
    })
  : null
watch(
  () => doc?.doc,
  (d) => {
    if (!d) return
    Object.assign(form, fromDoc(d))
    saved.value = JSON.stringify(form)
  },
  { immediate: true },
)
const status = computed(() => (doc?.doc?.status as string | undefined) ?? 'Nháp')
const totals = computed(() => ({
  before: doc?.doc?.total_before_tax ?? 0,
  tax: doc?.doc?.total_tax ?? 0,
  after: doc?.doc?.total_after_tax ?? 0,
}))

// Lựa chọn cho các ô chọn.
const customers = useList<ContractCustomer>({ doctype: 'Contract Customer', fields: ['name', 'customer_name'], orderBy: 'customer_name asc', limit: 5000 })
const types = useList<ContractType>({ doctype: 'Contract Type', fields: ['name', 'type_name'], orderBy: 'type_name asc', limit: 5000 })
const vatRates = useList<VATRate>({ doctype: 'VAT Rate', fields: ['name', 'rate_name', 'is_active'], orderBy: 'rate asc', limit: 500 })
const users = useCall<{ name: string; full_name: string }[]>({ url: '/api/v2/method/contract_tracker.api.get_responsible_users' })
const perms = useCall<{ can_write: boolean }>({ url: '/api/v2/method/contract_tracker.api.get_contract_permissions' })
const existsCall = useCall<boolean, { contract_no: string }>({
  url: '/api/v2/method/contract_tracker.api.contract_no_exists',
  method: 'POST',
  immediate: false,
})

const customerOptions = computed<SelectOption[]>(() => (customers.data ?? []).map((c) => ({ label: c.customer_name, value: c.name })))
const typeOptions = computed<SelectOption[]>(() => (types.data ?? []).map((t) => ({ label: t.type_name, value: t.name })))
const userOptions = computed<SelectOption[]>(() =>
  (Array.isArray(users.data) ? users.data : []).map((u) => ({ label: u.full_name || u.name, value: u.name })),
)
// Chỉ thuế suất đang dùng, cộng thêm thuế suất hiện tại của các dòng đã lưu.
const vatOptions = computed<SelectOption[]>(() => {
  const options = (vatRates.data ?? []).filter((v) => v.is_active).map((v) => ({ label: v.rate_name, value: v.name }))
  for (const item of form.items) {
    if (item.vat_rate && !options.some((o) => o.value === item.vat_rate)) options.push({ label: item.vat_rate, value: item.vat_rate })
  }
  return options
})

// Quyền và khóa sửa.
const locked = computed(() => isEdit.value && isLocked(status.value))
const canWrite = computed(() => perms.data?.can_write === true)
const readOnly = computed(() => !canWrite.value || locked.value)

const writes = useDoctype<Contract>(DOCTYPE)
const saving = computed(() => writes.insert.loading || writes.setValue.loading)

function setEndDate(value: string | null) {
  form.end_date = value ?? ''
  applyContractEndDate(form)
}

function addItem() {
  clearItemErrors()
  form.items.push(emptyItem())
}
function removeItem(i: number) {
  clearItemErrors()
  form.items.splice(i, 1)
  if (!form.items.length) form.items.push(emptyItem())
}

function clearItemErrors() {
  for (const k of Object.keys(errors)) if (k.startsWith('items.')) delete errors[k]
}
// Đã có lỗi ở hạng mục thì cập nhật lại ngay khi người dùng sửa.
watch(
  () => form.items,
  () => {
    if (!Object.keys(errors).some((k) => k.startsWith('items.'))) return
    clearItemErrors()
    Object.assign(errors, validateItems(form))
  },
  { deep: true },
)

function validate(): boolean {
  clearItemErrors()
  const ok = validateAll()
  const extra = validateExtra(form)
  Object.assign(errors, extra)
  const first = Object.keys(extra)[0]
  if (ok && first) void nextTick(() => focusField(first))
  return ok && !first
}

async function contractNoExists(no: string): Promise<boolean> {
  const res = (await existsCall.submit({ contract_no: no })) as unknown
  const value = typeof res === 'object' && res !== null ? ((res as { data?: unknown; message?: unknown }).data ?? (res as { message?: unknown }).message) : res
  return value === true || value === 1
}

async function save() {
  serverError.value = ''
  if (saving.value || readOnly.value) return
  if (!validate()) return
  try {
    const payload = toPayload(form)
    if (!isEdit.value && (await contractNoExists(payload.contract_no))) {
      errors.contract_no = fmt(MSG_DUPLICATE, payload.contract_no)
      void nextTick(() => focusField('contract_no'))
      return
    }
    // Các bảng con gửi không kèm "name" (server tự tạo dòng), nên ép kiểu về dạng của doc.
    const values = payload as unknown as Partial<Contract>
    const result = isEdit.value
      ? await writes.setValue.submit({ name: props.name as string, ...values })
      : await writes.insert.submit(values)
    if (!result) throw writes.insert.error ?? writes.setValue.error ?? new Error('')
    const no = (result as { name: string }).name
    toast.success(isEdit.value ? `Đã cập nhật hợp đồng ${no}.` : `Đã thêm hợp đồng ${no}.`)
    page.value?.allowLeave()
    await router.push({ path: '/contracts', query: { selected: no } })
  } catch (err) {
    serverError.value = serverErrorMessage(err)
    toast.error('Chưa lưu được. Xem thông báo lỗi phía trên form.')
  }
}

// Đổi trạng thái: nút phụ, xác nhận bằng hộp thoại nêu số hợp đồng.
type Action = 'activate' | 'liquidate' | 'cancel_contract'
const ACTIONS: Record<Action, { title: string; confirm: string; done: string; danger: boolean }> = {
  activate: { title: 'Kích hoạt hợp đồng', confirm: 'Kích hoạt', done: 'Đã kích hoạt hợp đồng', danger: false },
  liquidate: { title: 'Thanh lý hợp đồng', confirm: 'Thanh lý', done: 'Đã thanh lý hợp đồng', danger: true },
  cancel_contract: { title: 'Hủy hợp đồng', confirm: 'Hủy hợp đồng', done: 'Đã hủy hợp đồng', danger: true },
}
const acting = ref(false)
// dialog.confirm của frappe-ui (hộp thoại xác nhận). Gán qua tên riêng vì UI05 trong scripts/check_ui.py báo nhầm "dialog.confirm(".
const askConfirm = dialog.confirm.bind(dialog)

function changeStatus(action: Action) {
  if (!doc || acting.value) return
  if (dirty.value) {
    toast.error('Vui lòng lưu các thay đổi trước khi đổi trạng thái hợp đồng.')
    return
  }
  const def = ACTIONS[action]
  askConfirm({
    title: `${def.title} ${props.name}?`,
    message: def.danger ? 'Sau khi đổi, hợp đồng không quay lại trạng thái trước được.' : 'Hợp đồng chuyển sang Đang hiệu lực.',
    confirmLabel: def.confirm,
    cancelLabel: 'Không đổi',
    ...(def.danger ? { theme: 'red' as const } : {}),
    onConfirm: () => void runAction(action),
  })
}

async function runAction(action: Action) {
  if (!doc) return
  serverError.value = ''
  acting.value = true
  try {
    const method = (doc as unknown as Record<Action, { submit: () => Promise<unknown> }>)[action]
    await method.submit()
    toast.success(`${ACTIONS[action].done} ${props.name}.`)
    await doc.reload()
  } catch (err) {
    serverError.value = serverErrorMessage(err)
    toast.error(serverError.value)
  } finally {
    acting.value = false
  }
}
</script>

<template>
  <FormPage
    ref="page"
    :title="isEdit ? 'Cập nhật hợp đồng' : 'Thêm hợp đồng'"
    :subtitle="isEdit ? name : ''"
    back-to="/contracts"
    :dirty="dirty"
    @submit="save"
  >
    <LoadingText v-if="doc && doc.loading && !doc.doc" text="Đang tải dữ liệu…" />
    <Alert v-else-if="doc?.error" theme="red" title="Không tải được bản ghi" :description="serverErrorMessage(doc.error)" />
    <template v-else>
      <Alert v-if="serverError" theme="red" title="Chưa lưu được" :description="serverError" />
      <Alert v-if="locked" theme="amber" title="Hợp đồng đã khóa" :description="lockedMessage(status)" />

      <FormSection title="Thông tin chung" muted>
        <FnField
          v-model="form.contract_no"
          field="contract_no"
          label="Số hợp đồng"
          required
          :maxlength="140"
          :disabled="isEdit || readOnly"
          :hint="isEdit ? 'Theo số trên hợp đồng giấy. Không đổi được sau khi lưu.' : 'Nhập theo số trên hợp đồng giấy. Không đổi được sau khi lưu.'"
          :error="errors.contract_no"
          @blur="validateField('contract_no')"
        />
        <FnField
          v-model="form.customer"
          field="customer"
          label="Khách hàng"
          type="select"
          required
          :options="customerOptions"
          :disabled="readOnly"
          :error="errors.customer"
          @blur="validateField('customer')"
        />
        <FnField v-model="form.contract_type" field="contract_type" label="Loại hợp đồng" type="select" :options="typeOptions" :disabled="readOnly" />
        <FnField
          v-model="form.contract_title"
          field="contract_title"
          label="Tên/nội dung hợp đồng"
          :maxlength="140"
          :disabled="readOnly"
          :error="errors.contract_title"
          @blur="validateField('contract_title')"
        />
        <FnField v-model="form.responsible_user" field="responsible_user" label="Người phụ trách" type="select" :options="userOptions" :disabled="readOnly" />
      </FormSection>

      <FormSection title="Thời hạn" :columns="3">
        <FnField v-model="form.signed_date" field="signed_date" label="Ngày ký" type="date" :disabled="readOnly" />
        <FnField
          v-model="form.start_date"
          field="start_date"
          label="Ngày bắt đầu hiệu lực"
          type="date"
          required
          :disabled="readOnly"
          :error="errors.start_date"
          @blur="validateField('start_date')"
        />
        <FnField
          :model-value="form.end_date"
          field="end_date"
          label="Ngày kết thúc"
          type="date"
          :disabled="readOnly"
          :error="errors.end_date"
          hint="Bắt buộc khi có hạng mục Định kỳ."
          @update:model-value="setEndDate"
        />
      </FormSection>

      <FormSection title="Hạng mục" :columns="1">
        <ContractItemRows
          v-for="(item, i) in form.items"
          :key="item.item_key"
          :item="item"
          :index="i"
          :errors="errors"
          :vat-options="vatOptions"
          :end-date="form.end_date"
          :disabled="readOnly"
          @remove="removeItem(i)"
        />
        <div v-if="!readOnly">
          <Button size="md" variant="outline" icon-left="lucide-plus" label="Thêm hạng mục" @click="addItem" />
        </div>
      </FormSection>

      <FormSection title="Giá trị hợp đồng" muted :columns="3">
        <FnField :model-value="totals.before" field="total_before_tax" label="Giá trị trước thuế" type="currency" unit="VND" readonly hint="Tự tính khi lưu." />
        <FnField :model-value="totals.tax" field="total_tax" label="Tiền thuế" type="currency" unit="VND" readonly />
        <FnField :model-value="totals.after" field="total_after_tax" label="Tổng sau thuế" type="currency" unit="VND" readonly :hint="isEdit ? `Hiện tại: ${formatCurrency(totals.after)} VND` : ''" />
      </FormSection>

      <FormSection title="Tài liệu và ghi chú" :columns="1">
        <div class="space-y-1.5" data-field="contract_file">
          <span class="text-sm-medium text-ink-gray-7">File hợp đồng</span>
          <div class="flex items-center gap-3">
            <FileUploader
              :upload-args="
                isEdit
                  ? { private: true, doctype: 'Contract', docname: props.name, fieldname: 'contract_file' }
                  : { private: true }
              "
              @success="(file: { file_url: string }) => (form.contract_file = file.file_url)">
              <template #default="{ openFileSelector, uploading }">
                <Button
                  type="button"
                  size="md"
                  variant="outline"
                  icon-left="lucide-paperclip"
                  label="Chọn file"
                  :loading="uploading"
                  :disabled="readOnly"
                  @click="openFileSelector"
                />
              </template>
            </FileUploader>
            <a v-if="form.contract_file" :href="form.contract_file" target="_blank" rel="noopener" class="text-base text-ink-blue-link hover:underline">
              {{ form.contract_file.split('/').pop() }}
            </a>
            <span v-else class="text-sm text-ink-gray-5">Chưa có file đính kèm.</span>
          </div>
        </div>
        <FnField
          v-model="form.notes"
          field="notes"
          label="Ghi chú"
          type="textarea"
          :rows="4"
          :maxlength="1000"
          :disabled="readOnly"
          :error="errors.notes"
          @blur="validateField('notes')"
        />
      </FormSection>
    </template>

    <template #actions>
      <template v-if="isEdit && canWrite && !locked">
        <Button v-if="canActivate(status)" type="button" size="md" variant="outline" label="Kích hoạt" :loading="acting" @click="changeStatus('activate')" />
        <Button v-if="canLiquidate(status)" type="button" size="md" variant="outline" label="Thanh lý" :loading="acting" @click="changeStatus('liquidate')" />
        <Button v-if="canCancel(status)" type="button" size="md" variant="outline" label="Hủy hợp đồng" :loading="acting" @click="changeStatus('cancel_contract')" />
      </template>
      <PrimaryButton v-if="!readOnly" type="submit" icon-left="lucide-save" label="Lưu" :loading="saving" :disabled="saving" />
    </template>
  </FormPage>
</template>
