<script setup lang="ts">
// Màn danh sách Hóa đơn, theo mẫu ContractList.vue.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, useCall, useDoc, useList } from 'frappe-ui'
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
  type DataTableExpose,
  type DetailField,
  type SelectOption,
} from '@/standard'
import type { ContractCustomer } from '@/types/doctypes'
import {
  COLUMNS,
  DOCTYPE,
  ITEM_COLUMNS,
  TAX_COLUMNS,
  emptyFilters,
  filtersActive,
  groupTree,
  statCards,
  statusOf,
  toFrappeFilters,
  type PanelFilters,
  type SalesInvoiceRecord,
} from './invoices'

const route = useRoute()
const router = useRouter()

const draft = ref<PanelFilters>(emptyFilters())
const applied = ref<PanelFilters>(emptyFilters())

const list = useList<SalesInvoiceRecord>({
  doctype: DOCTYPE,
  fields: [
    'name',
    'invoice_no',
    'invoice_series',
    'customer',
    'customer_name',
    'invoice_date',
    'status',
    'total_before_tax',
    'total_tax',
    'grand_total',
    'notes',
    'modified',
  ],
  filters: () => toFrappeFilters(applied.value),
  orderBy: 'modified desc',
  limit: 5000,
})
const allForTree = useList<SalesInvoiceRecord>({ doctype: DOCTYPE, fields: ['name', 'status'], limit: 5000 })

const customers = useList<ContractCustomer>({ doctype: 'Contract Customer', fields: ['name', 'customer_name'], orderBy: 'customer_name asc', limit: 5000 })
const customerOptions = computed<SelectOption[]>(() => (customers.data ?? []).map((c) => ({ label: c.customer_name, value: c.name })))
const perms = useCall<{ invoice_write: boolean; receipt_write: boolean }>({ url: '/api/v2/method/contract_tracker.api.get_billing_permissions' })
const canWrite = computed(() => perms.data?.invoice_write === true)

const rows = computed(() => list.data ?? [])
const card = ref<string | null>(null)
const tableRows = computed(() => (card.value ? rows.value.filter((r) => r.status === card.value) : rows.value))
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

// useList không trả bảng con nên các đợt và bảng theo thuế suất lấy từ chính hóa đơn đang chọn.
const detail = useDoc<SalesInvoiceRecord>({ doctype: DOCTYPE, name: () => selected.value ?? '', immediate: false })
watch(selected, (v) => v && void detail.reload(), { immediate: true })
const loaded = computed(() => (detail.doc?.name === selected.value ? detail.doc : null))

const detailFields = computed<DetailField[]>(() => {
  const r = current.value
  if (!r) return []
  return [
    { label: 'Số hóa đơn', value: r.invoice_no },
    { label: 'Ký hiệu', value: r.invoice_series },
    { label: 'Khách hàng', value: r.customer_name },
    { label: 'Ngày xuất', value: formatDate(r.invoice_date) },
    { label: 'Trạng thái', value: statusOf(r).label },
    { label: 'Tổng cộng (VND)', value: formatCurrency(r.grand_total) },
    { label: 'Ghi chú', value: r.notes, wide: true },
  ]
})

const table = ref<DataTableExpose | null>(null)
function exportExcel() {
  table.value?.exportExcel(`hoa-don-${new Date().toISOString().slice(0, 10)}`)
}
</script>

<template>
  <SplitLayout :searching="list.loading" @search="search">
    <template #group>
      <GroupTree v-model="draft.groups" :nodes="groupTree(allForTree.data ?? [])" />
    </template>
    <template #filters>
      <FnField v-model="draft.customer" field="f-customer" label="Khách hàng" type="select" :options="customerOptions" />
      <FnField v-model="draft.dateFrom" field="f-date-from" label="Ngày xuất từ" type="date" />
      <FnField v-model="draft.dateTo" field="f-date-to" label="Ngày xuất đến" type="date" />
      <FnField v-model="draft.invoiceNo" field="f-invoice-no" label="Số hóa đơn" />
      <button type="button" class="text-base text-ink-blue-link hover:underline" @click="clearAll">Xóa bộ lọc</button>
    </template>

    <PageTitle title="Hóa đơn" :count="tableRows.length">
      <template #actions>
        <Button size="md" variant="outline" icon-left="lucide-file-spreadsheet" label="Xuất Excel" @click="exportExcel" />
        <PrimaryButton v-if="canWrite" icon-left="lucide-plus" label="Thêm hóa đơn" :route="'/invoices/new'" />
      </template>
    </PageTitle>

    <StatCards v-model:active="card" :cards="cards" />

    <p v-if="list.error" class="rounded-4 border border-outline-red-3 bg-surface-red-2 px-3 py-2 text-base text-ink-red-7" role="alert">
      Không tải được danh sách: {{ list.error.message }}
      <button type="button" class="ml-2 underline" @click="list.reload()">Thử lại</button>
    </p>

    <DataTable
      ref="table"
      v-model:selected="selected"
      :columns="COLUMNS"
      :rows="tableRows"
      :loading="list.loading"
      :external-filter-active="filtersActive(applied) || card !== null"
      caption="Bấm một dòng để xem chi tiết. Chưa có hóa đơn? Bấm Thêm hóa đơn để tạo."
      @clear-filters="clearAll"
    >
      <template #cell-_actions="{ row }">
        <Button
          size="sm"
          variant="ghost"
          icon-left="lucide-pencil"
          :label="canWrite ? 'Sửa' : 'Xem'"
          :route="`/invoices/${encodeURIComponent(row.name)}/edit`"
          @click.stop
        />
      </template>
    </DataTable>
    <p v-if="!list.loading && !list.error && !rows.length" class="text-base text-ink-gray-5">
      Chưa có hóa đơn. Bấm Thêm hóa đơn để tạo.
    </p>

    <DetailPanel v-if="current" :title="`${current.invoice_no} — ${current.customer_name ?? ''}`" :fields="detailFields" @close="selected = null">
      <template #actions>
        <Button
          size="sm"
          variant="outline"
          icon-left="lucide-pencil"
          label="Cập nhật"
          :route="`/invoices/${encodeURIComponent(current.name)}/edit`"
        />
      </template>
      <h3 class="mb-2 text-base-semibold text-ink-gray-8">Các đợt thu</h3>
      <MiniTable :columns="ITEM_COLUMNS" :rows="loaded?.items ?? []" empty-text="Hóa đơn chưa có đợt thu." />
      <h3 class="mb-2 mt-4 text-base-semibold text-ink-gray-8">Theo thuế suất</h3>
      <MiniTable :columns="TAX_COLUMNS" :rows="loaded?.tax_breakdown ?? []" row-key="vat_rate" empty-text="Chưa có số liệu thuế." />
    </DetailPanel>
  </SplitLayout>
</template>
