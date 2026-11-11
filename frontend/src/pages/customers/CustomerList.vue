<script setup lang="ts">
// Màn danh sách Khách hàng, theo mẫu ContractTypeList.vue.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, useList } from 'frappe-ui'
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
  formatDateTime,
  maskSensitive,
  type Column,
  type DataTableExpose,
  type DetailField,
  type StatCard,
} from '@/standard'
import {
  COLUMNS,
  DOCTYPE,
  emptyFilters,
  filtersActive,
  groupTree,
  hasTaxCode,
  toFrappeFilters,
  type ContractCustomer,
  type PanelFilters,
} from './customer'

const route = useRoute()
const router = useRouter()

const draft = ref<PanelFilters>(emptyFilters())
const applied = ref<PanelFilters>(emptyFilters())

const list = useList<ContractCustomer>({
  doctype: DOCTYPE,
  fields: [
    'name',
    'customer_name',
    'tax_code',
    'address',
    'contact_person',
    'representative_title',
    'phone',
    'email',
    'bank_account',
    'bank_name',
    'notes',
    'modified',
  ],
  filters: () => toFrappeFilters(applied.value),
  orderBy: 'modified desc',
  limit: 5000,
})
const allForTree = useList<ContractCustomer>({ doctype: DOCTYPE, fields: ['name', 'tax_code'], limit: 5000 })

const rows = computed(() => list.data ?? [])
const card = ref<string | null>(null)
const tableRows = computed(() => {
  if (card.value === 'has_tax') return rows.value.filter(hasTaxCode)
  if (card.value === 'no_tax') return rows.value.filter((r) => !hasTaxCode(r))
  return rows.value
})

const cards = computed<StatCard[]>(() => {
  const has = rows.value.filter(hasTaxCode).length
  return [
    { key: 'total', label: 'Tổng số khách hàng', value: rows.value.length },
    { key: 'has_tax', label: 'Có mã số thuế', value: has },
    { key: 'no_tax', label: 'Chưa có mã số thuế', value: rows.value.length - has },
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
const detailFields = computed<DetailField[]>(() => {
  const r = current.value
  if (!r) return []
  return [
    { label: 'Mã', value: r.name },
    { label: 'Tên khách hàng', value: r.customer_name },
    { label: 'Mã số thuế', value: r.tax_code },
    { label: 'Người liên hệ', value: r.contact_person },
    { label: 'Chức vụ người đại diện', value: r.representative_title },
    { label: 'Số điện thoại', value: maskSensitive(r.phone) },
    { label: 'Email', value: r.email },
    { label: 'Số tài khoản', value: maskSensitive(r.bank_account) },
    { label: 'Ngân hàng', value: r.bank_name },
    { label: 'Ngày cập nhật', value: formatDateTime(r.modified) },
    { label: 'Địa chỉ', value: r.address, wide: true },
    { label: 'Ghi chú', value: r.notes, wide: true },
  ]
})

const history = useList<{ name: string; owner: string; creation: string; data: string }>({
  doctype: 'Version',
  fields: ['name', 'owner', 'creation', 'data'],
  filters: () => ({ ref_doctype: DOCTYPE, docname: selected.value ?? '' }),
  orderBy: 'creation desc',
  limit: 20,
  immediate: false,
})
watch(selected, (v) => v && history.reload(), { immediate: true })
const HISTORY_COLUMNS: Column<{ owner: string; creation: string; data: string }>[] = [
  { key: 'creation', label: 'Thời gian', width: 170, format: (r) => formatDateTime(r.creation) },
  { key: 'owner', label: 'Người thực hiện', width: 240 },
  { key: 'data', label: 'Trường thay đổi', width: 400, format: (r) => changedFields(r.data) },
]
function changedFields(data: string): string {
  try {
    const d = JSON.parse(data) as { changed?: [string, unknown, unknown][] }
    return (d.changed ?? []).map((c) => c[0]).join(', ') || 'Tạo mới'
  } catch {
    return ''
  }
}

const table = ref<DataTableExpose | null>(null)
function exportExcel() {
  table.value?.exportExcel(`khach-hang-${new Date().toISOString().slice(0, 10)}`)
}
</script>

<template>
  <SplitLayout :searching="list.loading" @search="search">
    <template #group>
      <GroupTree v-model="draft.groups" :nodes="groupTree(allForTree.data ?? [])" />
    </template>
    <template #filters>
      <FnField v-model="draft.customerName" field="f-customer-name" label="Tên" />
      <FnField v-model="draft.taxCode" field="f-tax-code" label="Mã số thuế" />
      <FnField v-model="draft.contactPerson" field="f-contact-person" label="Người liên hệ" />
      <button type="button" class="text-base text-ink-blue-link hover:underline" @click="clearAll">Xóa bộ lọc</button>
    </template>

    <PageTitle title="Khách hàng" :count="tableRows.length">
      <template #actions>
        <Button size="md" variant="outline" icon-left="lucide-file-spreadsheet" label="Xuất Excel" @click="exportExcel" />
        <PrimaryButton icon-left="lucide-plus" label="Thêm khách hàng" :route="'/customers/new'" />
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
      caption="Bấm một dòng để xem chi tiết"
      @clear-filters="clearAll"
    >
      <template #cell-_actions="{ row }">
        <Button
          size="sm"
          variant="ghost"
          icon-left="lucide-pencil"
          label="Sửa"
          :route="`/customers/${encodeURIComponent(row.name)}/edit`"
          @click.stop
        />
      </template>
    </DataTable>

    <DetailPanel v-if="current" :title="`${current.name} — ${current.customer_name}`" :fields="detailFields" @close="selected = null">
      <template #actions>
        <Button
          size="sm"
          variant="outline"
          icon-left="lucide-pencil"
          label="Cập nhật"
          :route="`/customers/${encodeURIComponent(current.name)}/edit`"
        />
      </template>
      <h3 class="mb-2 text-base-semibold text-ink-gray-8">Lịch sử thay đổi</h3>
      <MiniTable :columns="HISTORY_COLUMNS" :rows="history.data ?? []" empty-text="Chưa có thay đổi nào sau khi tạo." />
    </DetailPanel>
  </SplitLayout>
</template>
