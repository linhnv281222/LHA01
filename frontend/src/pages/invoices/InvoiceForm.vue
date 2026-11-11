<script setup lang="ts">
// Form thêm mới / cập nhật Hóa đơn, theo mẫu ContractForm.vue. Chuẩn chưa có bảng nhập nhiều dòng
// nên mỗi dòng đợt là một hàng FnField (như ContractItemRows.vue).
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Alert, Button, LoadingText, dialog, toast, useCall, useDoc, useDoctype, useList } from 'frappe-ui'
import {
  FnField,
  FormPage,
  FormSection,
  MiniTable,
  PrimaryButton,
  focusField,
  formatCurrency,
  serverErrorMessage,
  useFormValidation,
  type SelectOption,
} from '@/standard'
import type { ContractCustomer } from '@/types/doctypes'
import {
  DOCTYPE,
  FORM_RULES,
  TAX_COLUMNS,
  applySchedule,
  canCancelInvoice,
  computeTotals,
  emptyForm,
  ensureBlankRow,
  fromDoc,
  isLocked,
  toPayload,
  validateItems,
  MSG_CANCELLED_LOCKED,
  type OpenSchedule,
  type SalesInvoiceRecord,
} from './invoices'

const props = defineProps<{ name?: string }>()
const router = useRouter()
const isEdit = computed(() => !!props.name)

const form = reactive(emptyForm())
const saved = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== saved.value)
const { errors, validateField, validateAll } = useFormValidation(form, FORM_RULES)
const serverError = ref('')
const page = ref<InstanceType<typeof FormPage> | null>(null)

const doc = isEdit.value
  ? useDoc<SalesInvoiceRecord>({
      doctype: DOCTYPE,
      name: props.name as string,
      methods: { cancel_invoice: 'cancel_invoice' },
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
const status = computed(() => (doc?.doc?.status as string | undefined) ?? 'Hiệu lực')

// Lựa chọn cho các ô chọn.
const customers = useList<ContractCustomer>({ doctype: 'Contract Customer', fields: ['name', 'customer_name'], orderBy: 'customer_name asc', limit: 5000 })
const customerOptions = computed<SelectOption[]>(() => (customers.data ?? []).map((c) => ({ label: c.customer_name, value: c.name })))
const perms = useCall<{ invoice_write: boolean; receipt_write: boolean }>({ url: '/api/v2/method/contract_tracker.api.get_billing_permissions' })

const locked = computed(() => isEdit.value && isLocked(status.value))
const canWrite = computed(() => perms.data?.invoice_write === true)
const readOnly = computed(() => !canWrite.value || locked.value)

// Đợt chưa xuất hóa đơn của khách hàng đã chọn (kèm đợt của chính hóa đơn này khi sửa).
const openCall = useCall<OpenSchedule[], { customer: string; exclude_invoice?: string }>({
  url: '/api/v2/method/contract_tracker.api.get_open_schedules',
  method: 'POST',
  immediate: false,
})
const openSchedules = ref<OpenSchedule[]>([])
function unwrap<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  const r = res as { data?: unknown; message?: unknown } | null
  const value = r?.data ?? r?.message
  return Array.isArray(value) ? (value as T[]) : []
}
async function loadOpenSchedules() {
  if (!form.customer) {
    openSchedules.value = []
    return
  }
  const res = await openCall.submit({ customer: form.customer, ...(props.name ? { exclude_invoice: props.name } : {}) })
  openSchedules.value = unwrap<OpenSchedule>(res)
}
watch(
  () => form.customer,
  (value, old) => {
    if (!isEdit.value && old !== undefined && value !== old) {
      // Đổi khách hàng thì bỏ các đợt đã chọn (đợt thuộc khách hàng khác).
      form.items.splice(0, form.items.length)
      ensureBlankRow(form.items)
    }
    void loadOpenSchedules()
  },
  { immediate: true },
)

function optionsFor(index: number): SelectOption[] {
  const chosen = new Set(form.items.filter((_it, i) => i !== index).map((it) => it.schedule))
  const current = form.items[index]?.schedule
  const rows = openSchedules.value.filter((s) => !chosen.has(s.name) || s.name === current)
  const options = rows.map((s) => ({
    label: `${s.schedule_name ?? s.name} — ${s.contract ?? ''} (${formatCurrency(s.total_amount)} VND)`,
    value: s.name,
  }))
  if (current && !options.some((o) => o.value === current)) {
    options.push({ label: form.items[index].schedule_name || current, value: current })
  }
  return options
}

function pickSchedule(index: number, value: string | null) {
  applySchedule(form.items[index], openSchedules.value.find((s) => s.name === value))
  clearItemErrors()
  ensureBlankRow(form.items)
}
function removeRow(index: number) {
  clearItemErrors()
  form.items.splice(index, 1)
  ensureBlankRow(form.items)
}
function clearItemErrors() {
  for (const k of Object.keys(errors)) if (k === 'items' || k.startsWith('items.')) delete errors[k]
}

const totals = computed(() => computeTotals(form.items))

const writes = useDoctype<SalesInvoiceRecord>(DOCTYPE)
const saving = computed(() => writes.insert.loading || writes.setValue.loading)

function validate(): boolean {
  clearItemErrors()
  const ok = validateAll()
  const extra = validateItems(form)
  Object.assign(errors, extra)
  const first = Object.keys(extra)[0]
  if (ok && first) void nextTick(() => focusField(first))
  return ok && !first
}

async function save() {
  serverError.value = ''
  if (saving.value || readOnly.value) return
  if (!validate()) return
  try {
    // Bảng con gửi không kèm "name" (server tự tạo dòng), nên ép kiểu về dạng của doc.
    const values = toPayload(form) as unknown as Partial<SalesInvoiceRecord>
    const result = isEdit.value
      ? await writes.setValue.submit({ name: props.name as string, ...values })
      : await writes.insert.submit(values)
    if (!result) throw writes.insert.error ?? writes.setValue.error ?? new Error('')
    const name = (result as { name: string }).name
    toast.success(isEdit.value ? `Đã cập nhật hóa đơn ${form.invoice_no.trim()}.` : `Đã thêm hóa đơn ${form.invoice_no.trim()}.`)
    page.value?.allowLeave()
    await router.push({ path: '/invoices', query: { selected: name } })
  } catch (err) {
    serverError.value = serverErrorMessage(err)
    toast.error('Chưa lưu được. Xem thông báo lỗi phía trên form.')
  }
}

// Hủy hóa đơn: nút phụ, xác nhận bằng hộp thoại nêu số hóa đơn.
const acting = ref(false)
// dialog.confirm của frappe-ui. Gán qua tên riêng vì UI05 trong scripts/check_ui.py báo nhầm "dialog.confirm(".
const askConfirm = dialog.confirm.bind(dialog)

function cancelInvoice() {
  if (!doc || acting.value) return
  if (dirty.value) {
    toast.error('Vui lòng lưu các thay đổi trước khi hủy hóa đơn.')
    return
  }
  askConfirm({
    title: `Hủy hóa đơn ${form.invoice_no}?`,
    message: 'Các đợt thu trong hóa đơn quay về Chưa xuất và hóa đơn không sửa được nữa.',
    confirmLabel: 'Hủy hóa đơn',
    cancelLabel: 'Không hủy',
    theme: 'red',
    onConfirm: () => void runCancel(),
  })
}

async function runCancel() {
  if (!doc) return
  serverError.value = ''
  acting.value = true
  try {
    const method = (doc as unknown as { cancel_invoice: { submit: () => Promise<unknown> } }).cancel_invoice
    await method.submit()
    toast.success(`Đã hủy hóa đơn ${form.invoice_no}.`)
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
    :title="isEdit ? 'Cập nhật hóa đơn' : 'Thêm hóa đơn'"
    :subtitle="isEdit ? form.invoice_no : ''"
    back-to="/invoices"
    :dirty="dirty"
    @submit="save"
  >
    <LoadingText v-if="doc && doc.loading && !doc.doc" text="Đang tải dữ liệu…" />
    <Alert v-else-if="doc?.error" theme="red" title="Không tải được bản ghi" :description="serverErrorMessage(doc.error)" />
    <template v-else>
      <Alert v-if="serverError" theme="red" title="Chưa lưu được" :description="serverError" />
      <Alert v-if="locked" theme="amber" title="Hóa đơn đã khóa" :description="MSG_CANCELLED_LOCKED" />

      <FormSection title="Thông tin chung" muted>
        <FnField
          v-model="form.customer"
          field="customer"
          label="Khách hàng"
          type="select"
          required
          :options="customerOptions"
          :disabled="isEdit || readOnly"
          hint="Không đổi được sau khi tạo."
          :error="errors.customer"
          @blur="validateField('customer')"
        />
        <FnField
          v-model="form.invoice_no"
          field="invoice_no"
          label="Số hóa đơn"
          required
          :maxlength="140"
          :disabled="readOnly"
          :error="errors.invoice_no"
          @blur="validateField('invoice_no')"
        />
        <FnField v-model="form.invoice_series" field="invoice_series" label="Ký hiệu" :maxlength="140" :disabled="readOnly" />
        <FnField
          v-model="form.invoice_date"
          field="invoice_date"
          label="Ngày xuất"
          type="date"
          required
          :disabled="readOnly"
          :error="errors.invoice_date"
          @blur="validateField('invoice_date')"
        />
        <FnField
          v-model="form.notes"
          field="notes"
          label="Ghi chú"
          type="textarea"
          :rows="2"
          :maxlength="1000"
          :disabled="readOnly"
          :error="errors.notes"
          @blur="validateField('notes')"
        />
      </FormSection>

      <FormSection title="Các đợt thu" :columns="1">
        <p v-if="!form.customer" class="text-base text-ink-gray-5">Chọn khách hàng để chọn các đợt chưa xuất hóa đơn.</p>
        <div v-else data-field="items" class="space-y-3">
          <div
            v-for="(item, i) in form.items"
            :key="i"
            class="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_auto] items-start gap-x-4 gap-y-2 rounded-4 border border-outline-gray-2 p-3"
          >
            <FnField
              :model-value="item.schedule"
              :field="`items.${i}.schedule`"
              label="Đợt thu"
              type="select"
              :options="optionsFor(i)"
              :disabled="readOnly"
              :error="errors[`items.${i}.schedule`]"
              @update:model-value="(v: string | null) => pickSchedule(i, v)"
            />
            <FnField :model-value="item.contract" :field="`items.${i}.contract`" label="Hợp đồng" readonly />
            <FnField :model-value="item.vat_rate" :field="`items.${i}.vat_rate`" label="Thuế suất" readonly />
            <FnField :model-value="item.tax_amount" :field="`items.${i}.tax_amount`" label="Tiền thuế" type="currency" unit="VND" readonly />
            <FnField :model-value="item.total_amount" :field="`items.${i}.total_amount`" label="Tổng tiền" type="currency" unit="VND" readonly />
            <div class="pt-5">
              <Button v-if="!readOnly && item.schedule" size="sm" variant="ghost" icon-left="lucide-x" label="Xóa dòng" @click="removeRow(i)" />
            </div>
          </div>
          <p v-if="errors.items" class="flex items-center gap-1 text-sm text-ink-red-7" role="alert">
            <span class="lucide-circle-alert size-3.5 shrink-0" aria-hidden="true" />{{ errors.items }}
          </p>
        </div>
      </FormSection>

      <FormSection title="Tổng tiền" muted :columns="3">
        <FnField :model-value="totals.before" field="total_before_tax" label="Tổng trước thuế" type="currency" unit="VND" readonly hint="Tự tính khi lưu." />
        <FnField :model-value="totals.tax" field="total_tax" label="Tổng thuế" type="currency" unit="VND" readonly />
        <FnField :model-value="totals.total" field="grand_total" label="Tổng cộng" type="currency" unit="VND" readonly />
        <div class="col-span-3">
          <h3 class="mb-2 text-base-semibold text-ink-gray-8">Theo thuế suất</h3>
          <MiniTable :columns="TAX_COLUMNS" :rows="totals.byTax" row-key="vat_rate" empty-text="Chưa chọn đợt thu nào." />
        </div>
      </FormSection>
    </template>

    <template #actions>
      <Button
        v-if="isEdit && canWrite && canCancelInvoice(status)"
        type="button"
        size="md"
        variant="outline"
        label="Hủy hóa đơn"
        :loading="acting"
        @click="cancelInvoice"
      />
      <PrimaryButton v-if="!readOnly" type="submit" icon-left="lucide-save" label="Lưu" :loading="saving" :disabled="saving" />
    </template>
  </FormPage>
</template>
