<script setup lang="ts">
// Màn danh sách Biên bản nghiệm thu, theo mẫu PaymentRequestList.vue.
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
  STATUSES,
  emptyFilters,
  filtersActive,
  groupTree,
  printUrl,
  statCards,
  statusOf,
  toFrappeFilters,
  type AcceptanceMinutes,
  type PanelFilters,
} from './acceptanceMinutes'

const route = useRoute()
const router = useRouter()

const draft = ref<PanelFilters>(emptyFilters())
const applied = ref<PanelFilters>(emptyFilters())

const list = useList<AcceptanceMinutes>({
  doctype: DOCTYPE,
  fields: [
    'name',
    'customer',
    'customer_name',
    'minutes_date',
    'status',
    'schedule_count',
    'grand_total',
    'content',
    'party_a_rep',
    'party_b_rep',
    'scan_file',
    'notes',
    'modified',
  ],
  filters: () => toFrappeFilters(applied.value),
  orderBy: 'modified desc',
  limit: 5000,
})
const allForTree = useList<AcceptanceMinutes>({ doctype: DOCTYPE, fields: ['name', 'status'], limit: 5000 })

const customers = useList<ContractCustomer>({ doctype: 'Contract Customer', fields: ['name', 'customer_name'], orderBy: 'customer_name asc', limit: 5000 })
const customerOptions = computed<SelectOption[]>(() => (customers.data ?? []).map((c) => ({ label: c.customer_name, value: c.name })))
const perms = useCall<{ acceptance_write: boolean }>({ url: '/api/v2/method/contract_tracker.api.get_billing_permissions' })
const canWrite = computed(() => perms.data?.acceptance_write === true)

const rows = computed(() => list.data ?? [])
const card = ref<string | null>(null)
const tableRows = computed(() =>
  card.value && (STATUSES as readonly string[]).includes(card.value) ? rows.value.filter((r) => r.status === card.value) : rows.value,
)
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

// useList không trả bảng con nên các đợt lấy từ chính biên bản đang chọn.
const detail = useDoc<AcceptanceMinutes>({ doctype: DOCTYPE, name: () => selected.value ?? '', immediate: false })
watch(selected, (v) => v && void detail.reload(), { immediate: true })
const loaded = computed(() => (detail.doc?.name === selected.value ? detail.doc : null))

const detailFields = computed<DetailField[]>(() => {
  const r = current.value
  if (!r) return []
  return [
    { label: 'Số biên bản', value: r.name },
    { label: 'Khách hàng', value: r.customer_name },
    { label: 'Ngày nghiệm thu', value: formatDate(r.minutes_date) },
    { label: 'Trạng thái', value: statusOf(r).label },
    { label: 'Đại diện bên A', value: r.party_a_rep },
    { label: 'Đại diện bên B', value: r.party_b_rep },
    { label: 'Giá trị các đợt sau thuế (VND)', value: formatCurrency(r.grand_total) },
    { label: 'Nội dung nghiệm thu', value: r.content, wide: true },
    { label: 'File scan', value: r.scan_file ? String(r.scan_file).split('/').pop() : 'Chưa có file scan', wide: true },
    { label: 'Ghi chú', value: r.notes, wide: true },
  ]
})

function print(name: string) {
  window.open(printUrl(name), '_blank')
}

const table = ref<DataTableExpose | null>(null)
function exportExcel() {
  table.value?.exportExcel(`bien-ban-nghiem-thu-${new Date().toISOString().slice(0, 10)}`)
}
</script>

<template>
  <SplitLayout :searching="list.loading" @search="search">
    <template #group>
      <GroupTree v-model="draft.groups" :nodes="groupTree(allForTree.data ?? [])" />
    </template>
    <template #filters>
      <FnField v-model="draft.customer" field="f-customer" label="Khách hàng" type="select" :options="customerOptions" />
      <FnField v-model="draft.dateFrom" field="f-date-from" label="Ngày nghiệm thu từ" type="date" />
      <FnField v-model="draft.dateTo" field="f-date-to" label="Ngày nghiệm thu đến" type="date" />
      <FnField v-model="draft.minutesNo" field="f-minutes-no" label="Số biên bản" />
      <button type="button" class="text-base text-ink-blue-link hover:underline" @click="clearAll">Xóa bộ lọc</button>
    </template>

    <PageTitle title="Biên bản nghiệm thu" :count="tableRows.length">
      <template #actions>
        <Button size="md" variant="outline" icon-left="lucide-file-spreadsheet" label="Xuất Excel" @click="exportExcel" />
        <PrimaryButton v-if="canWrite" icon-left="lucide-plus" label="Thêm biên bản nghiệm thu" :route="'/acceptance-minutes/new'" />
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
      caption="Bấm một dòng để xem chi tiết. Chưa có biên bản? Bấm Thêm biên bản nghiệm thu để tạo."
      @clear-filters="clearAll"
    >
      <template #cell-_actions="{ row }">
        <Button
          size="sm"
          variant="ghost"
          icon-left="lucide-pencil"
          :label="canWrite ? 'Sửa' : 'Xem'"
          :route="`/acceptance-minutes/${encodeURIComponent(row.name)}/edit`"
          @click.stop
        />
        <Button size="sm" variant="ghost" icon-left="lucide-printer" label="In" @click.stop="print(row.name)" />
      </template>
    </DataTable>
    <p v-if="!list.loading && !list.error && !rows.length" class="text-base text-ink-gray-5">
      Chưa có biên bản nghiệm thu. Bấm Thêm biên bản nghiệm thu để tạo.
    </p>

    <DetailPanel v-if="current" :title="`${current.name} — ${current.customer_name ?? ''}`" :fields="detailFields" @close="selected = null">
      <template #actions>
        <Button
          v-if="canWrite"
          size="sm"
          variant="outline"
          icon-left="lucide-pencil"
          label="Cập nhật"
          :route="`/acceptance-minutes/${encodeURIComponent(current.name)}/edit`"
        />
        <Button size="sm" variant="outline" icon-left="lucide-printer" label="In" @click="print(current.name)" />
      </template>
      <h3 class="mb-2 text-base-semibold text-ink-gray-8">Các đợt thu</h3>
      <MiniTable :columns="ITEM_COLUMNS" :rows="loaded?.items ?? []" empty-text="Biên bản chưa có đợt thu." />
    </DetailPanel>
  </SplitLayout>
</template>
