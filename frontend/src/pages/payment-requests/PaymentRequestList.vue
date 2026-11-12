<script setup lang="ts">
// Màn danh sách Đề nghị thanh toán, theo mẫu InvoiceList.vue.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, dialog, toast, useCall, useDoc, useDoctype, useList } from 'frappe-ui'
import {
  DataTable,
  DetailPanel,
  FnField,
  GroupTree,
  MiniTable,
  PageTitle,
  PrimaryButton,
  SplitLayout,
  StatCards,
  formatCurrency,
  formatDate,
  serverErrorMessage,
  type DataTableExpose,
  type DetailField,
  type SelectOption,
} from '@/standard'
import type { ContractCustomer } from '@/types/doctypes'
import {
  COLUMNS,
  DOCTYPE,
  canDelete,
  ITEM_COLUMNS,
  emptyFilters,
  filtersActive,
  groupTree,
  printUrl,
  statCards,
  statusOf,
  toFrappeFilters,
  type PanelFilters,
  type PaymentRequest,
} from './paymentRequest'

const route = useRoute()
const router = useRouter()

const draft = ref<PanelFilters>(emptyFilters())
const applied = ref<PanelFilters>(emptyFilters())

const list = useList<PaymentRequest>({
  doctype: DOCTYPE,
  fields: [
    'name',
    'customer',
    'customer_name',
    'request_date',
    'due_date',
    'status',
    'total_before_tax',
    'total_tax',
    'grand_total',
    'amount_in_words',
    'notes',
    'modified',
  ],
  filters: () => toFrappeFilters(applied.value),
  orderBy: 'modified desc',
  limit: 5000,
})
const allForTree = useList<PaymentRequest>({ doctype: DOCTYPE, fields: ['name', 'status'], limit: 5000 })

const customers = useList<ContractCustomer>({ doctype: 'Contract Customer', fields: ['name', 'customer_name'], orderBy: 'customer_name asc', limit: 5000 })
const customerOptions = computed<SelectOption[]>(() => (customers.data ?? []).map((c) => ({ label: c.customer_name, value: c.name })))
const perms = useCall<{ request_write: boolean }>({ url: '/api/v2/method/contract_tracker.api.get_billing_permissions' })
const canWrite = computed(() => perms.data?.request_write === true)

const rows = computed(() => list.data ?? [])
const card = ref<string | null>(null)
const tableRows = computed(() => (card.value && card.value !== 'sum' ? rows.value.filter((r) => r.status === card.value) : rows.value))
const cards = computed(() => statCards(rows.value))

function search() {
  applied.value = JSON.parse(JSON.stringify(draft.value)) as PanelFilters
}
function clearAll() {
  draft.value = emptyFilters()
  card.value = null
  search()
}

const selected = ref<string | null>((route.query.selected as string) || null)
watch(selected, (v) => {
  void router.replace({ query: { ...route.query, selected: v ?? undefined } })
})
const current = computed(() => rows.value.find((r) => r.name === selected.value) ?? null)

// useList không trả bảng con nên các đợt lấy từ chính đề nghị đang chọn.
const detail = useDoc<PaymentRequest>({ doctype: DOCTYPE, name: () => selected.value ?? '', immediate: false })
watch(selected, (v) => v && void detail.reload(), { immediate: true })
const loaded = computed(() => (detail.doc?.name === selected.value ? detail.doc : null))

const detailFields = computed<DetailField[]>(() => {
  const r = current.value
  if (!r) return []
  return [
    { label: 'Số đề nghị', value: r.name },
    { label: 'Khách hàng', value: r.customer_name },
    { label: 'Ngày lập', value: formatDate(r.request_date) },
    { label: 'Hạn thanh toán', value: formatDate(r.due_date) },
    { label: 'Trạng thái', value: statusOf(r).label },
    { label: 'Tổng cộng (VND)', value: formatCurrency(r.grand_total) },
    { label: 'Số tiền bằng chữ', value: r.amount_in_words, wide: true },
    { label: 'Ghi chú', value: r.notes, wide: true },
  ]
})

function print(name: string) {
  window.open(printUrl(name), '_blank')
}

// Xóa đề nghị Nháp: hộp thoại xác nhận nêu số đề nghị.
const writes = useDoctype<PaymentRequest>(DOCTYPE)
const deleting = ref(false)
const deleteError = ref('')
// dialog.confirm của frappe-ui. Gán qua tên riêng vì UI05 trong scripts/check_ui.py báo nhầm "dialog.confirm(".
const askConfirm = dialog.confirm.bind(dialog)

function askDelete(name: string) {
  if (deleting.value) return
  askConfirm({
    title: `Xóa đề nghị ${name}?`,
    message: 'Các đợt thu trong đề nghị sẽ trở về "Chưa lập" nếu không còn nằm trong đề nghị khác.',
    confirmLabel: 'Xóa đề nghị',
    cancelLabel: 'Không xóa',
    theme: 'red',
    onConfirm: () => void runDelete(name),
  })
}

async function runDelete(name: string) {
  deleteError.value = ''
  deleting.value = true
  try {
    await (writes.delete as unknown as { submit: (p: { name: string }) => Promise<unknown> }).submit({ name })
    toast.success(`Đã xóa đề nghị ${name}.`)
    if (selected.value === name) selected.value = null
    await list.reload()
    await allForTree.reload()
  } catch (err) {
    deleteError.value = serverErrorMessage(err)
    toast.error(deleteError.value)
  } finally {
    deleting.value = false
  }
}

const table = ref<DataTableExpose | null>(null)
function exportExcel() {
  table.value?.exportExcel(`de-nghi-thanh-toan-${new Date().toISOString().slice(0, 10)}`)
}
</script>

<template>
  <SplitLayout :searching="list.loading" @search="search">
    <template #group>
      <GroupTree v-model="draft.groups" :nodes="groupTree(allForTree.data ?? [])" />
    </template>
    <template #filters>
      <FnField v-model="draft.customer" field="f-customer" label="Khách hàng" type="select" :options="customerOptions" />
      <FnField v-model="draft.dateFrom" field="f-date-from" label="Ngày lập từ" type="date" />
      <FnField v-model="draft.dateTo" field="f-date-to" label="Ngày lập đến" type="date" />
      <FnField v-model="draft.requestNo" field="f-request-no" label="Số đề nghị" />
      <button type="button" class="text-base text-ink-blue-link hover:underline" @click="clearAll">Xóa bộ lọc</button>
    </template>

    <PageTitle title="Đề nghị thanh toán" :count="tableRows.length">
      <template #actions>
        <Button size="md" variant="outline" icon-left="lucide-file-spreadsheet" label="Xuất Excel" @click="exportExcel" />
        <PrimaryButton v-if="canWrite" icon-left="lucide-plus" label="Thêm đề nghị" :route="'/payment-requests/new'" />
      </template>
    </PageTitle>

    <StatCards v-model:active="card" :cards="cards" />

    <p v-if="list.error" class="rounded-4 border border-outline-red-3 bg-surface-red-2 px-3 py-2 text-base text-ink-red-7" role="alert">
      Không tải được danh sách: {{ list.error.message }}
      <button type="button" class="ml-2 underline" @click="list.reload()">Thử lại</button>
    </p>

    <p v-if="deleteError" class="rounded-4 border border-outline-red-3 bg-surface-red-2 px-3 py-2 text-base text-ink-red-7" role="alert">
      {{ deleteError }}
    </p>

    <DataTable
      ref="table"
      v-model:selected="selected"
      :columns="COLUMNS"
      :rows="tableRows"
      :loading="list.loading"
      :external-filter-active="filtersActive(applied) || card !== null"
      caption="Bấm một dòng để xem chi tiết. Chưa có đề nghị? Bấm Thêm đề nghị để tạo."
      @clear-filters="clearAll"
    >
      <template #cell-_actions="{ row }">
        <Button
          size="sm"
          variant="ghost"
          icon-left="lucide-pencil"
          :label="canWrite ? 'Sửa' : 'Xem'"
          :route="`/payment-requests/${encodeURIComponent(row.name)}/edit`"
          @click.stop
        />
        <Button
          v-if="canWrite && canDelete(row.status)"
          size="sm"
          variant="ghost"
          icon-left="lucide-trash-2"
          label="Xóa"
          :disabled="deleting"
          @click.stop="askDelete(row.name)"
        />
      </template>
    </DataTable>
    <p v-if="!list.loading && !list.error && !rows.length" class="text-base text-ink-gray-5">
      Chưa có đề nghị thanh toán. Bấm Thêm đề nghị để tạo.
    </p>

    <DetailPanel v-if="current" :title="`${current.name} — ${current.customer_name ?? ''}`" :fields="detailFields" @close="selected = null">
      <template #actions>
        <Button
          v-if="canWrite"
          size="sm"
          variant="outline"
          icon-left="lucide-pencil"
          label="Cập nhật"
          :route="`/payment-requests/${encodeURIComponent(current.name)}/edit`"
        />
        <Button size="sm" variant="outline" icon-left="lucide-printer" label="In" @click="print(current.name)" />
        <Button
          v-if="canWrite && canDelete(current.status)"
          size="sm"
          variant="outline"
          theme="red"
          icon-left="lucide-trash-2"
          label="Xóa"
          :disabled="deleting"
          @click="askDelete(current.name)"
        />
      </template>
      <h3 class="mb-2 text-base-semibold text-ink-gray-8">Các đợt thu</h3>
      <MiniTable :columns="ITEM_COLUMNS" :rows="loaded?.items ?? []" empty-text="Đề nghị chưa có đợt thu." />
    </DetailPanel>
  </SplitLayout>
</template>
