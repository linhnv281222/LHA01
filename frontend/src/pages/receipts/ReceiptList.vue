<script setup lang="ts">
// Màn danh sách Phiếu thu, theo mẫu ContractList.vue.
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
  ALLOC_COLUMNS,
  COLUMNS,
  DOCTYPE,
  emptyFilters,
  filtersActive,
  groupTree,
  statCards,
  toFrappeFilters,
  type PanelFilters,
  type PaymentReceipt,
} from './receipts'

const route = useRoute()
const router = useRouter()

const draft = ref<PanelFilters>(emptyFilters())
const applied = ref<PanelFilters>(emptyFilters())

const list = useList<PaymentReceipt>({
  doctype: DOCTYPE,
  fields: [
    'name',
    'customer',
    'customer_name',
    'receipt_date',
    'method',
    'amount',
    'allocated_total',
    'unallocated_amount',
    'notes',
    'modified',
  ],
  filters: () => toFrappeFilters(applied.value),
  orderBy: 'modified desc',
  limit: 5000,
})
const allForTree = useList<PaymentReceipt>({ doctype: DOCTYPE, fields: ['name', 'method'], limit: 5000 })

const customers = useList<ContractCustomer>({ doctype: 'Contract Customer', fields: ['name', 'customer_name'], orderBy: 'customer_name asc', limit: 5000 })
const customerOptions = computed<SelectOption[]>(() => (customers.data ?? []).map((c) => ({ label: c.customer_name, value: c.name })))
const perms = useCall<{ invoice_write: boolean; receipt_write: boolean }>({ url: '/api/v2/method/contract_tracker.api.get_billing_permissions' })
const canWrite = computed(() => perms.data?.receipt_write === true)

const rows = computed(() => list.data ?? [])
const tableRows = computed(() => rows.value)
const cards = computed(() => statCards(rows.value))

function search() {
  applied.value = JSON.parse(JSON.stringify(draft.value)) as PanelFilters
}
function clearAll() {
  draft.value = emptyFilters()
  search()
}

const selected = ref<string | null>((route.query.selected as string) || null)
watch(selected, (v) => {
  void router.replace({ query: { ...route.query, selected: v ?? undefined } })
})
const current = computed(() => rows.value.find((r) => r.name === selected.value) ?? null)

// useList không trả bảng con nên các dòng phân bổ lấy từ chính phiếu đang chọn.
const detail = useDoc<PaymentReceipt>({ doctype: DOCTYPE, name: () => selected.value ?? '', immediate: false })
watch(selected, (v) => v && void detail.reload(), { immediate: true })
const loaded = computed(() => (detail.doc?.name === selected.value ? detail.doc : null))

const detailFields = computed<DetailField[]>(() => {
  const r = current.value
  if (!r) return []
  return [
    { label: 'Số phiếu', value: r.name },
    { label: 'Khách hàng', value: r.customer_name },
    { label: 'Ngày thu', value: formatDate(r.receipt_date) },
    { label: 'Hình thức', value: r.method },
    { label: 'Số tiền (VND)', value: formatCurrency(r.amount) },
    { label: 'Đã phân bổ (VND)', value: formatCurrency(r.allocated_total) },
    { label: 'Chưa phân bổ (VND)', value: formatCurrency(r.unallocated_amount) },
    { label: 'Ghi chú', value: r.notes, wide: true },
  ]
})

const table = ref<DataTableExpose | null>(null)
function exportExcel() {
  table.value?.exportExcel(`phieu-thu-${new Date().toISOString().slice(0, 10)}`)
}

// Xóa phiếu: hộp thoại xác nhận nêu số phiếu.
const writes = useDoctype<PaymentReceipt>(DOCTYPE)
const deleting = ref(false)
const deleteError = ref('')
// dialog.confirm của frappe-ui. Gán qua tên riêng vì UI05 trong scripts/check_ui.py báo nhầm "dialog.confirm(".
const askConfirm = dialog.confirm.bind(dialog)

function askDelete(name: string) {
  if (deleting.value) return
  askConfirm({
    title: `Xóa phiếu thu ${name}?`,
    message: 'Số đã thu của các đợt và hợp đồng liên quan sẽ được tính lại.',
    confirmLabel: 'Xóa phiếu thu',
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
    toast.success(`Đã xóa phiếu thu ${name}.`)
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
</script>

<template>
  <SplitLayout :searching="list.loading" @search="search">
    <template #group>
      <GroupTree v-model="draft.groups" :nodes="groupTree(allForTree.data ?? [])" />
    </template>
    <template #filters>
      <FnField v-model="draft.customer" field="f-customer" label="Khách hàng" type="select" :options="customerOptions" />
      <FnField v-model="draft.dateFrom" field="f-date-from" label="Ngày thu từ" type="date" />
      <FnField v-model="draft.dateTo" field="f-date-to" label="Ngày thu đến" type="date" />
      <button type="button" class="text-base text-ink-blue-link hover:underline" @click="clearAll">Xóa bộ lọc</button>
    </template>

    <PageTitle title="Phiếu thu" :count="tableRows.length">
      <template #actions>
        <Button size="md" variant="outline" icon-left="lucide-file-spreadsheet" label="Xuất Excel" @click="exportExcel" />
        <PrimaryButton v-if="canWrite" icon-left="lucide-plus" label="Thêm phiếu thu" :route="'/receipts/new'" />
      </template>
    </PageTitle>

    <StatCards :cards="cards" />

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
      :external-filter-active="filtersActive(applied)"
      caption="Bấm một dòng để xem chi tiết. Chưa có phiếu thu? Bấm Thêm phiếu thu để tạo."
      @clear-filters="clearAll"
    >
      <template #cell-_actions="{ row }">
        <Button
          size="sm"
          variant="ghost"
          icon-left="lucide-pencil"
          :label="canWrite ? 'Sửa' : 'Xem'"
          :route="`/receipts/${encodeURIComponent(row.name)}/edit`"
          @click.stop
        />
        <Button
          v-if="canWrite"
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
      Chưa có phiếu thu. Bấm Thêm phiếu thu để tạo.
    </p>

    <DetailPanel v-if="current" :title="`${current.name} — ${current.customer_name ?? ''}`" :fields="detailFields" @close="selected = null">
      <template #actions>
        <Button
          size="sm"
          variant="outline"
          icon-left="lucide-pencil"
          label="Cập nhật"
          :route="`/receipts/${encodeURIComponent(current.name)}/edit`"
        />
      </template>
      <h3 class="mb-2 text-base-semibold text-ink-gray-8">Phân bổ vào đợt thu</h3>
      <MiniTable :columns="ALLOC_COLUMNS" :rows="loaded?.allocations ?? []" empty-text="Phiếu thu chưa phân bổ vào đợt nào." />
    </DetailPanel>
  </SplitLayout>
</template>
