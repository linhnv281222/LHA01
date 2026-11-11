<script setup lang="ts">
// Màn danh sách Hợp đồng, theo mẫu CustomerList.vue và ContractTypeList.vue.
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
  type Column,
  type DataTableExpose,
  type DetailField,
  type SelectOption,
  type StatCard,
} from '@/standard'
import type { ContractCustomer, ContractType } from '@/types/doctypes'
import {
  COLUMNS,
  CONTRACT_STATUS,
  DOCTYPE,
  emptyFilters,
  filtersActive,
  groupTree,
  toFrappeFilters,
  type Contract,
  type ContractItem,
  type PanelFilters,
} from './contract'

const route = useRoute()
const router = useRouter()

const draft = ref<PanelFilters>(emptyFilters())
const applied = ref<PanelFilters>(emptyFilters())

const list = useList<Contract>({
  doctype: DOCTYPE,
  fields: [
    'name',
    'contract_no',
    'customer',
    'customer_name',
    'contract_type',
    'contract_type_name',
    'contract_title',
    'responsible_user',
    'responsible_name',
    'signed_date',
    'start_date',
    'end_date',
    'status',
    'total_before_tax',
    'total_tax',
    'total_after_tax',
    'notes',
    'modified',
  ],
  filters: () => toFrappeFilters(applied.value),
  orderBy: 'modified desc',
  limit: 5000,
})
const allForTree = useList<Contract>({ doctype: DOCTYPE, fields: ['name', 'status'], limit: 5000 })

// Lựa chọn cho các ô lọc.
const customers = useList<ContractCustomer>({ doctype: 'Contract Customer', fields: ['name', 'customer_name'], orderBy: 'customer_name asc', limit: 5000 })
const types = useList<ContractType>({ doctype: 'Contract Type', fields: ['name', 'type_name'], orderBy: 'type_name asc', limit: 5000 })
const users = useCall<{ name: string; full_name: string }[]>({ url: '/api/v2/method/contract_tracker.api.get_responsible_users' })
const customerOptions = computed<SelectOption[]>(() => (customers.data ?? []).map((c) => ({ label: c.customer_name, value: c.name })))
const typeOptions = computed<SelectOption[]>(() => (types.data ?? []).map((t) => ({ label: t.type_name, value: t.name })))
const userOptions = computed<SelectOption[]>(() =>
  (Array.isArray(users.data) ? users.data : []).map((u) => ({ label: u.full_name || u.name, value: u.name })),
)

const rows = computed(() => list.data ?? [])
const card = ref<string | null>(null)
const tableRows = computed(() => (card.value ? rows.value.filter((r) => r.status === card.value) : rows.value))

const cards = computed<StatCard[]>(() => {
  const count = (s: string) => rows.value.filter((r) => r.status === s).length
  const sum = rows.value.reduce((acc, r) => acc + Number(r.total_after_tax ?? 0), 0)
  return [
    { key: 'total', label: 'Tổng hợp đồng', value: rows.value.length },
    { key: 'Nháp', label: 'Nháp', value: count('Nháp'), status: CONTRACT_STATUS['Nháp'] },
    { key: 'Đang hiệu lực', label: 'Đang hiệu lực', value: count('Đang hiệu lực'), status: CONTRACT_STATUS['Đang hiệu lực'] },
    { key: 'sum', label: 'Tổng giá trị sau thuế (VND)', value: formatCurrency(sum) },
  ]
})

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

// useList không trả bảng con nên các hạng mục lấy từ chính hợp đồng đang chọn.
const detail = useDoc<Contract>({ doctype: DOCTYPE, name: () => selected.value ?? '', immediate: false })
watch(selected, (v) => v && void detail.reload(), { immediate: true })
const detailItems = computed<ContractItem[]>(() => (detail.doc?.name === selected.value ? (detail.doc?.items ?? []) : []))

const detailFields = computed<DetailField[]>(() => {
  const r = current.value
  if (!r) return []
  return [
    { label: 'Số hợp đồng', value: r.contract_no },
    { label: 'Khách hàng', value: r.customer_name },
    { label: 'Loại hợp đồng', value: r.contract_type_name },
    { label: 'Tên hợp đồng', value: r.contract_title },
    { label: 'Trạng thái', value: r.status },
    { label: 'Người phụ trách', value: r.responsible_name },
    { label: 'Ngày ký', value: formatDate(r.signed_date) },
    { label: 'Ngày bắt đầu', value: formatDate(r.start_date) },
    { label: 'Ngày kết thúc', value: formatDate(r.end_date) },
    { label: 'Giá trị trước thuế (VND)', value: formatCurrency(r.total_before_tax) },
    { label: 'Tiền thuế (VND)', value: formatCurrency(r.total_tax) },
    { label: 'Tổng sau thuế (VND)', value: formatCurrency(r.total_after_tax) },
    { label: 'Ghi chú', value: r.notes, wide: true },
  ]
})

const ITEM_COLUMNS: Column<ContractItem>[] = [
  { key: 'item_name', label: 'Tên hạng mục', width: 260 },
  { key: 'billing_type', label: 'Kiểu thu', width: 120 },
  { key: 'vat_rate', label: 'Thuế suất', width: 140 },
  { key: 'amount_before_tax', label: 'Trước thuế (VND)', width: 160, type: 'currency' },
  { key: 'tax_amount', label: 'Tiền thuế (VND)', width: 150, type: 'currency' },
]

const table = ref<DataTableExpose | null>(null)
function exportExcel() {
  table.value?.exportExcel(`hop-dong-${new Date().toISOString().slice(0, 10)}`)
}
</script>

<template>
  <SplitLayout :searching="list.loading" @search="search">
    <template #group>
      <GroupTree v-model="draft.groups" :nodes="groupTree(allForTree.data ?? [])" />
    </template>
    <template #filters>
      <FnField v-model="draft.contractNo" field="f-contract-no" label="Số hợp đồng" />
      <FnField v-model="draft.customer" field="f-customer" label="Khách hàng" type="select" :options="customerOptions" />
      <FnField v-model="draft.responsibleUser" field="f-responsible" label="Người phụ trách" type="select" :options="userOptions" />
      <FnField v-model="draft.contractType" field="f-contract-type" label="Loại hợp đồng" type="select" :options="typeOptions" />
      <button type="button" class="text-base text-ink-blue-link hover:underline" @click="clearAll">Xóa bộ lọc</button>
    </template>

    <PageTitle title="Hợp đồng" :count="tableRows.length">
      <template #actions>
        <Button size="md" variant="outline" icon-left="lucide-file-spreadsheet" label="Xuất Excel" @click="exportExcel" />
        <PrimaryButton icon-left="lucide-plus" label="Thêm hợp đồng" :route="'/contracts/new'" />
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
      caption="Bấm một dòng để xem chi tiết. Chưa có hợp đồng? Bấm Thêm hợp đồng để tạo."
      @clear-filters="clearAll"
    >
      <template #cell-_actions="{ row }">
        <Button
          size="sm"
          variant="ghost"
          icon-left="lucide-pencil"
          label="Sửa"
          :route="`/contracts/${encodeURIComponent(row.name)}/edit`"
          @click.stop
        />
      </template>
    </DataTable>
    <p v-if="!list.loading && !list.error && !rows.length" class="text-base text-ink-gray-5">
      Chưa có hợp đồng. Bấm Thêm hợp đồng để tạo.
    </p>

    <DetailPanel v-if="current" :title="`${current.contract_no} — ${current.customer_name ?? ''}`" :fields="detailFields" @close="selected = null">
      <template #actions>
        <Button
          size="sm"
          variant="outline"
          icon-left="lucide-pencil"
          label="Cập nhật"
          :route="`/contracts/${encodeURIComponent(current.name)}/edit`"
        />
      </template>
      <h3 class="mb-2 text-base-semibold text-ink-gray-8">Hạng mục</h3>
      <MiniTable :columns="ITEM_COLUMNS" :rows="detailItems" empty-text="Hợp đồng chưa có hạng mục." />
    </DetailPanel>
  </SplitLayout>
</template>
