<script setup lang="ts">
// Form thêm mới / cập nhật Đề nghị thanh toán, theo mẫu InvoiceForm.vue.
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Alert, Button, LoadingText, toast, useCall, useDoc, useDoctype, useList } from 'frappe-ui'
import {
  FnField,
  FormPage,
  FormSection,
  PrimaryButton,
  StatusBadge,
  focusField,
  formatCurrency,
  serverErrorMessage,
  useFormValidation,
  type SelectOption,
} from '@/standard'
import type { ContractCustomer } from '@/types/doctypes'
import { parseScheduleQuery } from '@/pages/payment-schedules/paymentSchedule'
import {
  DOCTYPE,
  FORM_RULES,
  MSG_SENT_LOCKED,
  applySchedule,
  canMarkSent,
  emptyForm,
  ensureBlankRow,
  formTotals,
  fromDoc,
  isLocked,
  prefillFromSchedules,
  printUrl,
  statusOf,
  toPayload,
  validateItems,
  type BankInfo,
  type PaymentRequest,
  type RequestableSchedule,
} from './paymentRequest'

const props = defineProps<{ name?: string }>()
const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!props.name)

function localToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const form = reactive(emptyForm(isEdit.value ? '' : localToday()))
const saved = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== saved.value)
const { errors, validateField, validateAll } = useFormValidation(form, FORM_RULES)
const serverError = ref('')
const page = ref<InstanceType<typeof FormPage> | null>(null)

const doc = isEdit.value
  ? useDoc<PaymentRequest>({ doctype: DOCTYPE, name: props.name as string, methods: { mark_sent: 'mark_sent' } })
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
const amountInWords = computed(() => (doc?.doc?.amount_in_words as string | undefined) || 'Tự tính khi lưu.')

// Tài khoản nhận tiền mặc định từ Cài đặt công ty (chỉ khi thêm mới).
const defaults = useCall<BankInfo>({ url: '/api/v2/method/contract_tracker.api.get_payment_request_defaults', immediate: !isEdit.value })
watch(
  () => defaults.data,
  (d) => {
    if (!d || isEdit.value) return
    for (const key of ['bank_account_holder', 'bank_account_no', 'bank_name', 'bank_branch'] as const) {
      if (!form[key]) form[key] = d[key] ?? ''
    }
    saved.value = JSON.stringify(form)
  },
  { immediate: true },
)

const customers = useList<ContractCustomer>({ doctype: 'Contract Customer', fields: ['name', 'customer_name'], orderBy: 'customer_name asc', limit: 5000 })
const customerOptions = computed<SelectOption[]>(() => (customers.data ?? []).map((c) => ({ label: c.customer_name, value: c.name })))
const perms = useCall<{ request_write: boolean }>({ url: '/api/v2/method/contract_tracker.api.get_billing_permissions' })

const locked = computed(() => isEdit.value && isLocked(status.value))
const canWrite = computed(() => perms.data?.request_write === true)
const readOnly = computed(() => !canWrite.value || locked.value)

// Đợt còn nợ của khách hàng đã chọn.
const openCall = useCall<RequestableSchedule[], { customer: string; request?: string }>({
  url: '/api/v2/method/contract_tracker.api.get_requestable_schedules',
  method: 'POST',
  immediate: false,
})
const openSchedules = ref<RequestableSchedule[]>([])
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
  const res = await openCall.submit({ customer: form.customer, ...(props.name ? { request: props.name } : {}) })
  openSchedules.value = unwrap<RequestableSchedule>(res)
}

// Điền sẵn từ Lịch thu tiền: /payment-requests/new?schedules=DT-1,DT-2 (chỉ khi thêm mới).
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
    const byName = Object.fromEntries((prefillList.data ?? []).map((s) => [s.name, s.customer]))
    form.customer = scheduleNames.map((n) => byName[n]).find(Boolean) ?? ''
    await nextTick()
    await loadOpenSchedules()
    const { items, skipped } = prefillFromSchedules(scheduleNames, byName, openSchedules.value)
    form.items.splice(0, form.items.length, ...items)
    if (skipped.length) {
      toast.warning(`Đã bỏ qua ${skipped.length} đợt không hợp lệ (đã thu đủ hoặc khác khách hàng): ${skipped.join(', ')}`)
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
      form.items.splice(0, form.items.length)
      ensureBlankRow(form.items)
    }
    void loadOpenSchedules()
  },
  { immediate: true },
)

void prefillFromQuery()

function optionsFor(index: number): SelectOption[] {
  const chosen = new Set(form.items.filter((_it, i) => i !== index).map((it) => it.schedule))
  const current = form.items[index]?.schedule
  const rows = openSchedules.value.filter((s) => !chosen.has(s.name) || s.name === current)
  const options = rows.map((s) => ({
    label:
      `${s.schedule_name ?? s.name} — ${s.contract ?? ''} (còn nợ ${formatCurrency(s.outstanding)} VND)` +
      (s.payment_request ? ` — đang ở đề nghị ${s.payment_request}` : ''),
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

const totals = computed(() => formTotals(form.items))

const writes = useDoctype<PaymentRequest>(DOCTYPE)
const saving = computed(() => writes.insert.loading || writes.setValue.loading)

function validate(): boolean {
  clearItemErrors()
  const ok = validateAll()
  // Đề nghị Đã gửi chỉ sửa ghi chú: các dòng đợt không kiểm tra lại (đợt có thể đã thu đủ sau khi lập).
  const extra = locked.value ? {} : validateItems(form, (doc?.doc?.items ?? []).map((i: { schedule: string }) => i.schedule))
  Object.assign(errors, extra)
  const first = Object.keys(extra)[0]
  if (ok && first) void nextTick(() => focusField(first))
  return ok && !first
}

async function save() {
  serverError.value = ''
  if (saving.value || !canWrite.value) return
  if (!validate()) return
  try {
    const values = toPayload(form) as unknown as Partial<PaymentRequest>
    const result = isEdit.value
      ? await writes.setValue.submit({ name: props.name as string, ...values })
      : await writes.insert.submit(values)
    if (!result) throw writes.insert.error ?? writes.setValue.error ?? new Error('')
    const name = (result as { name: string }).name
    toast.success(isEdit.value ? `Đã cập nhật đề nghị ${name}.` : `Đã thêm đề nghị ${name}.`)
    page.value?.allowLeave()
    await router.push({ path: '/payment-requests', query: { selected: name } })
  } catch (err) {
    serverError.value = serverErrorMessage(err)
    toast.error('Chưa lưu được. Xem thông báo lỗi phía trên form.')
  }
}

// Đánh dấu đã gửi: một chiều Nháp → Đã gửi.
const acting = ref(false)
async function markSent() {
  if (!doc || acting.value) return
  if (dirty.value) {
    toast.error('Vui lòng lưu các thay đổi trước khi đánh dấu đã gửi.')
    return
  }
  serverError.value = ''
  acting.value = true
  try {
    const method = (doc as unknown as { mark_sent: { submit: () => Promise<unknown> } }).mark_sent
    await method.submit()
    toast.success(`Đã đánh dấu đã gửi đề nghị ${props.name}.`)
    await doc.reload()
  } catch (err) {
    serverError.value = serverErrorMessage(err)
    toast.error(serverError.value)
  } finally {
    acting.value = false
  }
}

function print() {
  if (props.name) window.open(printUrl(props.name), '_blank')
}
</script>

<template>
  <FormPage
    ref="page"
    :title="isEdit ? 'Cập nhật đề nghị thanh toán' : 'Thêm đề nghị thanh toán'"
    :subtitle="isEdit ? props.name : ''"
    back-to="/payment-requests"
    :dirty="dirty"
    @submit="save"
  >
    <LoadingText v-if="doc && doc.loading && !doc.doc" text="Đang tải dữ liệu…" />
    <Alert v-else-if="doc?.error" theme="red" title="Không tải được bản ghi" :description="serverErrorMessage(doc.error)" />
    <template v-else>
      <Alert v-if="serverError" theme="red" title="Chưa lưu được" :description="serverError" />
      <Alert v-if="locked" theme="amber" title="Đề nghị đã khóa" :description="MSG_SENT_LOCKED" />

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
          v-model="form.request_date"
          field="request_date"
          label="Ngày lập"
          type="date"
          required
          :disabled="readOnly"
          :error="errors.request_date"
          @blur="validateField('request_date')"
        />
        <FnField
          v-model="form.due_date"
          field="due_date"
          label="Hạn thanh toán"
          type="date"
          required
          :disabled="readOnly"
          :error="errors.due_date"
          @blur="validateField('due_date')"
        />
        <div class="flex flex-col gap-1">
          <span class="text-base text-ink-gray-7">Trạng thái</span>
          <StatusBadge :status="statusOf({ status: status as PaymentRequest['status'] })" />
        </div>
        <FnField
          v-model="form.notes"
          field="notes"
          label="Ghi chú"
          type="textarea"
          :rows="2"
          :maxlength="1000"
          :disabled="!canWrite"
          :error="errors.notes"
          @blur="validateField('notes')"
        />
      </FormSection>

      <FormSection title="Các đợt thu" :columns="1">
        <p v-if="!form.customer" class="text-base text-ink-gray-5">Chọn khách hàng để chọn các đợt còn nợ.</p>
        <div v-else data-field="items" class="space-y-3">
          <div
            v-for="(item, i) in form.items"
            :key="i"
            class="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_1fr_auto] items-start gap-x-4 gap-y-2 rounded-4 border border-outline-gray-2 p-3"
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
            <FnField :model-value="item.amount_before_tax" :field="`items.${i}.amount_before_tax`" label="Trước thuế" type="currency" unit="VND" readonly />
            <FnField :model-value="item.tax_amount" :field="`items.${i}.tax_amount`" label="Tiền thuế" type="currency" unit="VND" readonly />
            <FnField :model-value="item.total_amount" :field="`items.${i}.total_amount`" label="Tổng tiền" type="currency" unit="VND" readonly />
            <FnField :model-value="item.outstanding" :field="`items.${i}.outstanding`" label="Còn nợ" type="currency" unit="VND" readonly />
            <div class="pt-5">
              <Button v-if="!readOnly && item.schedule" size="sm" variant="ghost" icon-left="lucide-x" label="Xóa dòng" @click="removeRow(i)" />
            </div>
          </div>
          <p class="text-base-semibold text-ink-gray-8">
            Tổng các đợt: {{ formatCurrency(totals.total) }} VND
          </p>
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
          <FnField :model-value="amountInWords" field="amount_in_words" label="Số tiền bằng chữ" readonly />
        </div>
      </FormSection>

      <FormSection title="Tài khoản nhận tiền" :columns="2">
        <FnField v-model="form.bank_account_holder" field="bank_account_holder" label="Chủ tài khoản" :maxlength="140" :disabled="readOnly" />
        <FnField v-model="form.bank_account_no" field="bank_account_no" label="Số tài khoản" :maxlength="140" :disabled="readOnly" />
        <FnField v-model="form.bank_name" field="bank_name" label="Ngân hàng" :maxlength="140" :disabled="readOnly" />
        <FnField v-model="form.bank_branch" field="bank_branch" label="Chi nhánh" :maxlength="140" :disabled="readOnly" />
      </FormSection>
    </template>

    <template #actions>
      <Button v-if="isEdit" type="button" size="md" variant="outline" icon-left="lucide-printer" label="In" @click="print" />
      <Button
        v-if="isEdit && canWrite && canMarkSent(status)"
        type="button"
        size="md"
        variant="outline"
        icon-left="lucide-send"
        label="Đánh dấu đã gửi"
        :loading="acting"
        @click="markSent"
      />
      <PrimaryButton v-if="canWrite" type="submit" icon-left="lucide-save" label="Lưu" :loading="saving" :disabled="saving" />
    </template>
  </FormPage>
</template>
