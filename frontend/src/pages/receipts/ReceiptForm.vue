<script setup lang="ts">
// Form thêm mới / cập nhật Phiếu thu, theo mẫu ContractForm.vue. Chuẩn chưa có bảng nhập nhiều dòng
// nên mỗi dòng phân bổ là một hàng FnField (như ContractItemRows.vue).
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Alert, Button, LoadingText, toast, useCall, useDoc, useDoctype, useList } from 'frappe-ui'
import {
  FnField,
  FormPage,
  FormSection,
  PrimaryButton,
  focusField,
  formatCurrency,
  formatDate,
  serverErrorMessage,
  useFormValidation,
  type SelectOption,
} from '@/standard'
import type { ContractCustomer, SalesInvoiceRecord } from '@/types/doctypes'
import { parseScheduleQuery } from '@/pages/payment-schedules/paymentSchedule'
import {
  DOCTYPE,
  FORM_RULES,
  METHODS,
  allocationSummary,
  applySuggestion,
  emptyForm,
  ensureBlankRow,
  fromDoc,
  prefillAllocations,
  toPayload,
  validateAllocations,
  type PaymentReceipt,
  type ReceivableSchedule,
  type Suggestion,
} from './receipts'

const props = defineProps<{ name?: string }>()
const router = useRouter()
const isEdit = computed(() => !!props.name)

const form = reactive(emptyForm())
const saved = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== saved.value)
const { errors, validateField, validateAll } = useFormValidation(form, FORM_RULES)
const serverError = ref('')
const page = ref<InstanceType<typeof FormPage> | null>(null)

const doc = isEdit.value ? useDoc<PaymentReceipt>({ doctype: DOCTYPE, name: props.name as string }) : null
watch(
  () => doc?.doc,
  (d) => {
    if (!d) return
    Object.assign(form, fromDoc(d))
    saved.value = JSON.stringify(form)
  },
  { immediate: true },
)

// Lựa chọn cho các ô chọn.
const customers = useList<ContractCustomer>({ doctype: 'Contract Customer', fields: ['name', 'customer_name'], orderBy: 'customer_name asc', limit: 5000 })
const customerOptions = computed<SelectOption[]>(() => (customers.data ?? []).map((c) => ({ label: c.customer_name, value: c.name })))
const methodOptions: SelectOption[] = METHODS.map((m) => ({ label: m, value: m }))
const perms = useCall<{ invoice_write: boolean; receipt_write: boolean }>({ url: '/api/v2/method/contract_tracker.api.get_billing_permissions' })
const canWrite = computed(() => perms.data?.receipt_write === true)
const readOnly = computed(() => !canWrite.value)

// "Ưu tiên hóa đơn": chỉ là lựa chọn ở giao diện cho nút Gợi ý phân bổ, không lưu vào phiếu.
const priorityInvoice = ref('')
const invoices = useList<SalesInvoiceRecord>({
  doctype: 'Sales Invoice Record',
  fields: ['name', 'invoice_no', 'invoice_series'],
  filters: () => ({ customer: form.customer || '__none__', status: 'Hiệu lực' }),
  orderBy: 'invoice_date desc',
  limit: 500,
})
const invoiceOptions = computed<SelectOption[]>(() =>
  (invoices.data ?? []).map((i) => ({ label: [i.invoice_no, i.invoice_series].filter(Boolean).join(' - '), value: i.name })),
)

function unwrap<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  const r = res as { data?: unknown; message?: unknown } | null
  const value = r?.data ?? r?.message
  return Array.isArray(value) ? (value as T[]) : []
}

// Đợt còn nợ của khách hàng (không tính tiền của chính phiếu này).
const receivableCall = useCall<ReceivableSchedule[], { customer: string; receipt?: string }>({
  url: '/api/v2/method/contract_tracker.api.get_receivable_schedules',
  method: 'POST',
  immediate: false,
})
const receivable = ref<ReceivableSchedule[]>([])
async function loadReceivable() {
  if (!form.customer) {
    receivable.value = []
    return
  }
  const res = await receivableCall.submit({ customer: form.customer, ...(props.name ? { receipt: props.name } : {}) })
  receivable.value = unwrap<ReceivableSchedule>(res)
}
// Điền sẵn từ Lịch thu tiền: /receipts/new?schedules=DT-1,DT-2 (chỉ khi thêm mới).
// Cờ `prefilling` để watcher đổi khách hàng không xóa dòng và không tải đợt lần hai.
const route = useRoute()
let prefilling = false
const scheduleNames = isEdit.value ? [] : parseScheduleQuery(route.query.schedules)
const prefillList = useList<{ name: string; customer: string }>({
  doctype: 'Payment Schedule',
  fields: ['name', 'customer'],
  filters: { name: ['in', scheduleNames] },
  limit: 5000,
  immediate: false,
})
async function prefillFromQuery() {
  if (!scheduleNames.length) return
  prefilling = true
  try {
    await prefillList.reload()
    const customers = Object.fromEntries((prefillList.data ?? []).map((s) => [s.name, s.customer]))
    const first = scheduleNames.map((n) => customers[n]).find(Boolean) ?? ''
    form.customer = first
    await nextTick()
    await loadReceivable()
    const { allocations, amount, skipped } = prefillAllocations(scheduleNames, customers, receivable.value, first)
    form.allocations.splice(0, form.allocations.length, ...allocations)
    form.amount = amount
    if (skipped.length) {
      toast.warning(`Đã bỏ qua ${skipped.length} đợt không hợp lệ (đã xuất hóa đơn, đã thu đủ hoặc khác khách hàng): ${skipped.join(', ')}`)
    }
  } finally {
    await nextTick()
    prefilling = false
  }
}

watch(
  () => form.customer,
  (value, old) => {
    if (prefilling) return
    if (!isEdit.value && old !== undefined && value !== old) {
      // Đổi khách hàng thì bỏ phân bổ cũ và hóa đơn ưu tiên (thuộc khách hàng khác).
      form.allocations.splice(0, form.allocations.length)
      ensureBlankRow(form.allocations)
      priorityInvoice.value = ''
    }
    void loadReceivable()
  },
  { immediate: true },
)

void prefillFromQuery()

const outstandingMap = computed(() => Object.fromEntries(receivable.value.map((s) => [s.name, s.outstanding])))

function optionsFor(index: number): SelectOption[] {
  const chosen = new Set(form.allocations.filter((_r, i) => i !== index).map((r) => r.schedule))
  const current = form.allocations[index]?.schedule
  const options = receivable.value
    .filter((s) => !chosen.has(s.name) || s.name === current)
    .map((s) => ({ label: `${s.schedule_name ?? s.name} — ${s.contract ?? ''}`, value: s.name }))
  if (current && !options.some((o) => o.value === current)) {
    options.push({ label: form.allocations[index].schedule_name || current, value: current })
  }
  return options
}

const summary = computed(() => allocationSummary(form))

function pickSchedule(index: number, value: string | null) {
  const row = form.allocations[index]
  const s = receivable.value.find((r) => r.name === value)
  row.schedule = s?.name ?? ''
  row.schedule_name = s?.schedule_name ?? ''
  row.contract = s?.contract ?? ''
  row.due_date = s?.due_date ?? ''
  row.outstanding = s?.outstanding ?? 0
  // Điền sẵn số phân bổ: phần còn nợ của đợt, tối đa số tiền chưa phân bổ của phiếu.
  if (s && !row.allocated_amount) row.allocated_amount = Math.max(0, Math.min(s.outstanding, summary.value.unallocated))
  if (!s) row.allocated_amount = null
  clearAllocationErrors()
  ensureBlankRow(form.allocations)
}
function removeRow(index: number) {
  clearAllocationErrors()
  form.allocations.splice(index, 1)
  ensureBlankRow(form.allocations)
}
function clearAllocationErrors() {
  for (const k of Object.keys(errors)) if (k === 'allocations' || k.startsWith('allocations.')) delete errors[k]
}

// Gợi ý phân bổ: gọi server (quy tắc 8), thay bảng phân bổ; người dùng sửa được sau đó.
const suggestCall = useCall<Suggestion[], { customer: string; amount: number; invoice?: string; receipt?: string }>({
  url: '/api/v2/method/contract_tracker.api.suggest_allocation',
  method: 'POST',
  immediate: false,
})
async function suggest() {
  serverError.value = ''
  if (!form.customer) {
    errors.customer = 'Vui lòng nhập khách hàng.'
    focusField('customer')
    return
  }
  if (!(Number(form.amount ?? 0) > 0)) {
    errors.amount = 'Vui lòng nhập số tiền.'
    focusField('amount')
    return
  }
  try {
    const res = await suggestCall.submit({
      customer: form.customer,
      amount: Number(form.amount),
      ...(priorityInvoice.value ? { invoice: priorityInvoice.value } : {}),
      ...(props.name ? { receipt: props.name } : {}),
    })
    clearAllocationErrors()
    applySuggestion(form, unwrap<Suggestion>(res))
    if (!form.allocations.some((r) => r.schedule)) toast.info('Khách hàng này không còn đợt thu nào còn nợ.')
  } catch (err) {
    serverError.value = serverErrorMessage(err)
    toast.error(serverError.value)
  }
}

const writes = useDoctype<PaymentReceipt>(DOCTYPE)
const saving = computed(() => writes.insert.loading || writes.setValue.loading)

function validate(): boolean {
  clearAllocationErrors()
  const ok = validateAll()
  const extra = validateAllocations(form, outstandingMap.value)
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
    const values = toPayload(form) as unknown as Partial<PaymentReceipt>
    const result = isEdit.value
      ? await writes.setValue.submit({ name: props.name as string, ...values })
      : await writes.insert.submit(values)
    if (!result) throw writes.insert.error ?? writes.setValue.error ?? new Error('')
    const name = (result as { name: string }).name
    toast.success(isEdit.value ? `Đã cập nhật phiếu thu ${name}.` : `Đã thêm phiếu thu ${name}.`)
    page.value?.allowLeave()
    await router.push({ path: '/receipts', query: { selected: name } })
  } catch (err) {
    serverError.value = serverErrorMessage(err)
    toast.error('Chưa lưu được. Xem thông báo lỗi phía trên form.')
  }
}
</script>

<template>
  <FormPage
    ref="page"
    :title="isEdit ? 'Cập nhật phiếu thu' : 'Thêm phiếu thu'"
    :subtitle="isEdit ? name : ''"
    back-to="/receipts"
    :dirty="dirty"
    @submit="save"
  >
    <LoadingText v-if="doc && doc.loading && !doc.doc" text="Đang tải dữ liệu…" />
    <Alert v-else-if="doc?.error" theme="red" title="Không tải được bản ghi" :description="serverErrorMessage(doc.error)" />
    <template v-else>
      <Alert v-if="serverError" theme="red" title="Chưa lưu được" :description="serverError" />

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
          v-model="form.receipt_date"
          field="receipt_date"
          label="Ngày thu"
          type="date"
          required
          :disabled="readOnly"
          :error="errors.receipt_date"
          @blur="validateField('receipt_date')"
        />
        <FnField
          v-model="form.amount"
          field="amount"
          label="Số tiền"
          type="currency"
          unit="VND"
          required
          :disabled="readOnly"
          :error="errors.amount"
          @blur="validateField('amount')"
        />
        <FnField
          v-model="form.method"
          field="method"
          label="Hình thức"
          type="select"
          required
          :options="methodOptions"
          :disabled="readOnly"
          :error="errors.method"
          @blur="validateField('method')"
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

      <FormSection title="Phân bổ vào đợt thu" :columns="1">
        <div class="flex items-end gap-4">
          <div class="w-80">
            <FnField
              v-model="priorityInvoice"
              field="priority_invoice"
              label="Ưu tiên hóa đơn"
              type="select"
              :options="invoiceOptions"
              :disabled="readOnly || !form.customer"
              hint="Không bắt buộc. Đợt của hóa đơn này được phân bổ trước."
            />
          </div>
          <div class="pb-5">
            <Button
              v-if="!readOnly"
              type="button"
              size="md"
              variant="outline"
              icon-left="lucide-wand-sparkles"
              label="Gợi ý phân bổ"
              :loading="suggestCall.loading"
              @click="suggest"
            />
          </div>
        </div>

        <p v-if="!form.customer" class="text-base text-ink-gray-5">Chọn khách hàng để chọn các đợt còn nợ.</p>
        <div v-else data-field="allocations" class="space-y-3">
          <div
            v-for="(row, i) in form.allocations"
            :key="i"
            class="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_auto] items-start gap-x-4 gap-y-2 rounded-4 border border-outline-gray-2 p-3"
          >
            <FnField
              :model-value="row.schedule"
              :field="`allocations.${i}.schedule`"
              label="Đợt thu"
              type="select"
              :options="optionsFor(i)"
              :disabled="readOnly"
              :error="errors[`allocations.${i}.schedule`]"
              @update:model-value="(v: string | null) => pickSchedule(i, v)"
            />
            <FnField :model-value="row.contract" :field="`allocations.${i}.contract`" label="Hợp đồng" readonly />
            <FnField :model-value="row.due_date ? formatDate(row.due_date) : ''" :field="`allocations.${i}.due_date`" label="Ngày đến hạn" readonly />
            <FnField :model-value="row.schedule ? row.outstanding : null" :field="`allocations.${i}.outstanding`" label="Còn nợ" type="currency" unit="VND" readonly />
            <FnField
              v-model="row.allocated_amount"
              :field="`allocations.${i}.allocated_amount`"
              label="Số phân bổ"
              type="currency"
              unit="VND"
              :disabled="readOnly || !row.schedule"
              :error="errors[`allocations.${i}.allocated_amount`]"
            />
            <div class="pt-5">
              <Button v-if="!readOnly && row.schedule" size="sm" variant="ghost" icon-left="lucide-x" label="Xóa dòng" @click="removeRow(i)" />
            </div>
          </div>
          <p v-if="errors.allocations" class="flex items-center gap-1 text-sm text-ink-red-7" role="alert">
            <span class="lucide-circle-alert size-3.5 shrink-0" aria-hidden="true" />{{ errors.allocations }}
          </p>
        </div>

        <p class="text-base tabular-nums text-ink-gray-8">
          Đã phân bổ: <strong>{{ formatCurrency(summary.allocated) }}</strong> VND /
          Chưa phân bổ: <strong>{{ formatCurrency(summary.unallocated) }}</strong> VND
        </p>
      </FormSection>
    </template>

    <template #actions>
      <PrimaryButton v-if="!readOnly" type="submit" icon-left="lucide-save" label="Lưu" :loading="saving" :disabled="saving" />
    </template>
  </FormPage>
</template>
