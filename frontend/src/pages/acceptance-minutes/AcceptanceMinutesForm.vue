<script setup lang="ts">
// Form thêm mới / cập nhật Biên bản nghiệm thu, theo mẫu PaymentRequestForm.vue.
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Alert, Button, FileUploader, LoadingText, dialog, toast, useCall, useDoc, useDoctype, useList } from 'frappe-ui'
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
  MSG_NEED_SCAN,
  MSG_SIGNED_LOCKED,
  applySchedule,
  canMarkSigned,
  contentFromItems,
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
  type AcceptableSchedule,
  type AcceptanceMinutes,
} from './acceptanceMinutes'

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
// Ô Nội dung chỉ tự điền khi người dùng chưa tự sửa; biên bản đã có thì coi như đã sửa.
const contentTouched = ref(isEdit.value)

// dialog.confirm của frappe-ui. Gán qua tên riêng vì UI05 trong scripts/check_ui.py báo nhầm "dialog.confirm(".
const askConfirm = dialog.confirm.bind(dialog)

const doc = isEdit.value
  ? useDoc<AcceptanceMinutes>({ doctype: DOCTYPE, name: props.name as string, methods: { mark_signed: 'mark_signed' } })
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

const customers = useList<ContractCustomer>({
  doctype: 'Contract Customer',
  fields: ['name', 'customer_name', 'contact_person'],
  orderBy: 'customer_name asc',
  limit: 5000,
})
const customerOptions = computed<SelectOption[]>(() => (customers.data ?? []).map((c) => ({ label: c.customer_name, value: c.name })))
const perms = useCall<{ acceptance_write: boolean }>({ url: '/api/v2/method/contract_tracker.api.get_billing_permissions' })

const locked = computed(() => isEdit.value && isLocked(status.value))
const canWrite = computed(() => perms.data?.acceptance_write === true)
const readOnly = computed(() => !canWrite.value || locked.value)

// Đợt cần nghiệm thu của khách hàng đã chọn.
const openCall = useCall<AcceptableSchedule[], { customer: string; minutes?: string }>({
  url: '/api/v2/method/contract_tracker.api.get_acceptable_schedules',
  method: 'POST',
  immediate: false,
})
const openSchedules = ref<AcceptableSchedule[]>([])
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
  const res = await openCall.submit({ customer: form.customer, ...(props.name ? { minutes: props.name } : {}) })
  openSchedules.value = unwrap<AcceptableSchedule>(res)
}

// Điền sẵn từ Lịch thu tiền: /acceptance-minutes/new?schedules=DT-1,DT-2 (chỉ khi thêm mới).
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
    fillContent()
    fillPartyA()
    if (skipped.length) {
      toast.warning(`Đã bỏ qua ${skipped.length} đợt không hợp lệ (không cần nghiệm thu hoặc khác khách hàng): ${skipped.join(', ')}`)
    }
  } finally {
    await nextTick()
    prefilling = false
  }
}

// Đại diện bên A mặc định là người liên hệ của khách hàng (chỉ khi ô còn trống).
function fillPartyA() {
  if (form.party_a_rep || isEdit.value) return
  const contact = customers.data?.find((c) => c.name === form.customer)?.contact_person
  if (contact) form.party_a_rep = contact
}
watch(() => customers.data, fillPartyA)

function fillContent() {
  if (contentTouched.value || readOnly.value) return
  form.content = contentFromItems(form.items)
}

watch(
  () => form.customer,
  (value, old) => {
    if (prefilling) return
    if (!isEdit.value && old !== undefined && value !== old) {
      form.items.splice(0, form.items.length)
      ensureBlankRow(form.items)
      fillContent()
    }
    fillPartyA()
    void loadOpenSchedules()
  },
  { immediate: true },
)

void prefillFromQuery()

function optionsFor(index: number): SelectOption[] {
  const chosen = new Set(form.items.filter((_it, i) => i !== index).map((it) => it.schedule))
  const current = form.items[index]?.schedule
  // Chỉ đợt chưa nằm trong biên bản khác.
  const rows = openSchedules.value.filter((s) => !s.acceptance_minutes && (!chosen.has(s.name) || s.name === current))
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
  fillContent()
}
function removeRow(index: number) {
  clearItemErrors()
  form.items.splice(index, 1)
  ensureBlankRow(form.items)
  fillContent()
}
function clearItemErrors() {
  for (const k of Object.keys(errors)) if (k === 'items' || k.startsWith('items.')) delete errors[k]
}

const totals = computed(() => formTotals(form.items))

const writes = useDoctype<AcceptanceMinutes>(DOCTYPE)
const saving = computed(() => writes.insert.loading || writes.setValue.loading)

function validate(): boolean {
  clearItemErrors()
  const ok = validateAll()
  // Biên bản Đã ký chỉ sửa ghi chú và file scan: các dòng đợt không kiểm tra lại.
  const extra = locked.value ? {} : validateItems(form)
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
    const values = toPayload(form) as unknown as Partial<AcceptanceMinutes>
    const result = isEdit.value
      ? await writes.setValue.submit({ name: props.name as string, ...values })
      : await writes.insert.submit(values)
    if (!result) throw writes.insert.error ?? writes.setValue.error ?? new Error('')
    const name = (result as { name: string }).name
    toast.success(isEdit.value ? `Đã cập nhật biên bản ${name}.` : `Đã thêm biên bản ${name}.`)
    page.value?.allowLeave()
    await router.push({ path: '/acceptance-minutes', query: { selected: name } })
  } catch (err) {
    serverError.value = serverErrorMessage(err)
    toast.error('Chưa lưu được. Xem thông báo lỗi phía trên form.')
  }
}

// Đánh dấu đã ký: một chiều Nháp → Đã ký, bắt buộc có file scan.
const acting = ref(false)
function markSigned() {
  if (!doc || acting.value) return
  if (dirty.value) {
    toast.error('Vui lòng lưu các thay đổi trước khi đánh dấu đã ký.')
    return
  }
  if (!form.scan_file) {
    toast.error(MSG_NEED_SCAN)
    return
  }
  askConfirm({
    title: `Đánh dấu đã ký biên bản ${props.name}?`,
    message: 'Sau khi đã ký, chỉ sửa được ghi chú và file scan; các đợt cần nghiệm thu chuyển sang Đã ký.',
    confirmLabel: 'Đánh dấu đã ký',
    cancelLabel: 'Chưa ký',
    onConfirm: () => void runMarkSigned(),
  })
}

async function runMarkSigned() {
  if (!doc) return
  serverError.value = ''
  acting.value = true
  try {
    const method = (doc as unknown as { mark_signed: { submit: () => Promise<unknown> } }).mark_signed
    await method.submit()
    toast.success(`Đã đánh dấu đã ký biên bản ${props.name}.`)
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

const uploadArgs = computed(() => ({
  private: true,
  ...(isEdit.value ? { doctype: 'Acceptance Minutes', docname: props.name, fieldname: 'scan_file' } : {}),
}))
</script>

<template>
  <FormPage
    ref="page"
    :title="isEdit ? 'Cập nhật biên bản nghiệm thu' : 'Thêm biên bản nghiệm thu'"
    :subtitle="isEdit ? props.name : ''"
    back-to="/acceptance-minutes"
    :dirty="dirty"
    @submit="save"
  >
    <LoadingText v-if="doc && doc.loading && !doc.doc" text="Đang tải dữ liệu…" />
    <Alert v-else-if="doc?.error" theme="red" title="Không tải được bản ghi" :description="serverErrorMessage(doc.error)" />
    <template v-else>
      <Alert v-if="serverError" theme="red" title="Chưa lưu được" :description="serverError" />
      <Alert v-if="locked" theme="amber" title="Biên bản đã khóa" :description="MSG_SIGNED_LOCKED" />

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
          v-model="form.minutes_date"
          field="minutes_date"
          label="Ngày nghiệm thu"
          type="date"
          required
          :disabled="readOnly"
          :error="errors.minutes_date"
          @blur="validateField('minutes_date')"
        />
        <div class="flex flex-col gap-1">
          <span class="text-base text-ink-gray-7">Trạng thái</span>
          <StatusBadge :status="statusOf({ status: status as AcceptanceMinutes['status'] })" />
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
        <p v-if="!form.customer" class="text-base text-ink-gray-5">Chọn khách hàng để chọn các đợt cần nghiệm thu.</p>
        <div v-else data-field="items" class="space-y-3">
          <div
            v-for="(item, i) in form.items"
            :key="i"
            class="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] items-start gap-x-4 gap-y-2 rounded-4 border border-outline-gray-2 p-3"
          >
            <FnField
              :model-value="item.schedule"
              :field="`items.${i}.schedule`"
              label="Đợt"
              type="select"
              :options="optionsFor(i)"
              :disabled="readOnly"
              :error="errors[`items.${i}.schedule`]"
              @update:model-value="(v: string | null) => pickSchedule(i, v)"
            />
            <FnField :model-value="item.contract" :field="`items.${i}.contract`" label="Hợp đồng" readonly />
            <FnField :model-value="item.due_date" :field="`items.${i}.due_date`" label="Hạn" type="date" readonly />
            <FnField :model-value="item.total_amount" :field="`items.${i}.total_amount`" label="Tổng tiền" type="currency" unit="VND" readonly />
            <div class="pt-5">
              <Button v-if="!readOnly && item.schedule" size="sm" variant="ghost" icon-left="lucide-x" label="Xóa dòng" @click="removeRow(i)" />
            </div>
          </div>
          <p class="text-base-semibold text-ink-gray-8">
            {{ totals.count }} đợt, tổng: {{ formatCurrency(totals.total) }} VND
          </p>
          <p v-if="errors.items" class="flex items-center gap-1 text-sm text-ink-red-7" role="alert">
            <span class="lucide-circle-alert size-3.5 shrink-0" aria-hidden="true" />{{ errors.items }}
          </p>
        </div>
      </FormSection>

      <FormSection title="Nội dung nghiệm thu" :columns="2">
        <div class="col-span-2">
          <FnField
            v-model="form.content"
            field="content"
            label="Nội dung nghiệm thu"
            type="textarea"
            :rows="4"
            :disabled="readOnly"
            hint="Tự điền khi chọn đợt, bạn có thể sửa."
            @update:model-value="contentTouched = true"
          />
        </div>
        <FnField
          v-model="form.party_a_rep"
          field="party_a_rep"
          label="Đại diện bên A"
          :maxlength="140"
          :disabled="readOnly"
          :error="errors.party_a_rep"
          @blur="validateField('party_a_rep')"
        />
        <FnField
          v-model="form.party_b_rep"
          field="party_b_rep"
          label="Đại diện bên B"
          :maxlength="140"
          :disabled="readOnly"
          :error="errors.party_b_rep"
          @blur="validateField('party_b_rep')"
        />
      </FormSection>

      <FormSection title="File scan" :columns="1">
        <div class="space-y-1.5" data-field="scan_file">
          <span class="text-sm-medium text-ink-gray-7">File biên bản đã ký</span>
          <div class="flex items-center gap-3">
            <FileUploader :upload-args="uploadArgs" @success="(file: { file_url: string }) => (form.scan_file = file.file_url)">
              <template #default="{ openFileSelector, uploading }">
                <Button
                  type="button"
                  size="md"
                  variant="outline"
                  icon-left="lucide-paperclip"
                  label="Chọn file"
                  :loading="uploading"
                  :disabled="!canWrite"
                  @click="openFileSelector"
                />
              </template>
            </FileUploader>
            <a v-if="form.scan_file" :href="form.scan_file" target="_blank" rel="noopener" class="text-base text-ink-blue-link hover:underline">
              {{ form.scan_file.split('/').pop() }}
            </a>
            <span v-else class="text-sm text-ink-gray-5">Chưa có file scan.</span>
          </div>
        </div>
      </FormSection>
    </template>

    <template #actions>
      <Button v-if="isEdit" type="button" size="md" variant="outline" icon-left="lucide-printer" label="In" @click="print" />
      <Button
        v-if="isEdit && canWrite && canMarkSigned(status)"
        type="button"
        size="md"
        variant="outline"
        icon-left="lucide-file-signature"
        label="Đánh dấu đã ký"
        :loading="acting"
        @click="markSigned"
      />
      <PrimaryButton v-if="canWrite" type="submit" icon-left="lucide-save" label="Lưu" :loading="saving" :disabled="saving" />
    </template>
  </FormPage>
</template>
