<script setup lang="ts">
// Màn danh sách Hợp đồng, theo mẫu CustomerList.vue và ContractTypeList.vue.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Tooltip, useCall, useDoc, useList } from 'frappe-ui'
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
  StatusBadge,
  formatCurrency,
  type Column,
  type DataTableExpose,
  type DetailField,
  type SelectOption,
  type StatCard,
} from '@/standard'
import type { ContractCustomer, ContractType } from '@/types/doctypes'
import { todayStr } from '@/pages/payment-schedules/paymentSchedule'
import {
  COLUMNS,
  DOCTYPE,
  SCHEDULE_LIMIT,
  SCHEDULE_LIST_FIELDS,
  asideCards,
  collectedPercent,
  detailFields,
  detailTitle,
  effectiveText,
  emptyFilters,
  filtersActive,
  groupTree,
  installmentText,
  itemAfterTax,
  itemTotals,
  nextDueDate,
  nextDueText,
  normalizeGroups,
  overdueScheduleFilters,
  partyLines,
  periodBadge,
  remainingText,
  statCards,
  statusOf,
  toFrappeFilters,
  usableSchedules,
  type Contract,
  type ContractItem,
  type ContractSchedule,
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
    'invoiced_amount',
    'paid_amount',
    'outstanding_amount',
    'notes',
    'modified',
  ],
  filters: () => toFrappeFilters(applied.value),
  orderBy: 'modified desc',
  limit: 5000,
})
const allForTree = useList<Contract>({ doctype: DOCTYPE, fields: ['name', 'status', 'end_date'], limit: 5000 })

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

// Tích "Sắp hết hạn" thì bỏ các trạng thái; tích lại trạng thái thì bỏ "Sắp hết hạn".
watch(
  () => draft.value.groups,
  (next, prev) => {
    const v = normalizeGroups(next, prev ?? [])
    if (v !== next) draft.value.groups = v
  },
)

// "Hôm nay" tính một lần khi mở trang.
const today = todayStr()

// Đợt quá hạn: lọc ở server (đến hạn trước hôm nay, chưa thu đủ), không dùng IN theo tên hợp đồng.
// Lỗi hay chạm giới hạn thì không tính (thẻ hiện "Không có"); bảng chính vẫn dùng được.
const overdue = useList<ContractSchedule & { name: string }>({
  doctype: 'Payment Schedule',
  fields: SCHEDULE_LIST_FIELDS,
  filters: overdueScheduleFilters(today),
  limit: SCHEDULE_LIMIT,
})
const overdueRows = computed(() => usableSchedules(overdue.data, !!overdue.error, overdue.loading))
const overdueTruncated = computed(() => !overdue.error && !overdue.loading && (overdue.data?.length ?? 0) >= SCHEDULE_LIMIT)
const cards = computed<StatCard[]>(() => statCards(rows.value, overdueRows.value, today))

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

// Lịch thu chỉ của hợp đồng đang chọn (đợt thu của hạng mục, đợt kế tiếp).
const schedules = useList<ContractSchedule & { name: string }>({
  doctype: 'Payment Schedule',
  fields: SCHEDULE_LIST_FIELDS,
  filters: () => ({ contract: selected.value ?? '' }),
  limit: 500,
})

// useList không trả bảng con nên các hạng mục lấy từ chính hợp đồng đang chọn.
const detail = useDoc<Contract>({ doctype: DOCTYPE, name: () => selected.value ?? '', immediate: false })
watch(selected, (v) => v && void detail.reload(), { immediate: true })
const detailItems = computed<ContractItem[]>(() => (detail.doc?.name === selected.value ? (detail.doc?.items ?? []) : []))

const fields = computed<DetailField[]>(() => (current.value ? detailFields(current.value) : []))
const currentSchedules = computed<ContractSchedule[] | null>(() =>
  schedules.error || schedules.loading ? null : (schedules.data ?? []).filter((s) => s.contract === selected.value),
)
const LOADING = 'Đang tải…'
const nextDue = computed(() =>
  currentSchedules.value ? nextDueText(nextDueDate(currentSchedules.value, today)) : schedules.loading ? LOADING : 'Không có',
)
const installmentOf = (item: ContractItem) =>
  schedules.loading ? LOADING : installmentText(item.item_key, currentSchedules.value)
const asideCardList = computed<StatCard[]>(() => (current.value ? asideCards(current.value, nextDue.value) : []))
const itemTotalsRow = computed(() => {
  const t = itemTotals(detailItems.value)
  return {
    item_name: 'Tổng',
    amount_before_tax: formatCurrency(t.before),
    tax_amount: formatCurrency(t.tax),
    _after: formatCurrency(t.after),
  }
})

const badgeOf = (row: unknown) => periodBadge(row as ContractItem, detail.doc?.end_date)

const ITEM_COLUMNS: Column<ContractItem>[] = [
  { key: 'item_name', label: 'Tên hạng mục', width: 220 },
  { key: '_billing', label: 'Kiểu thu', width: 190 },
  { key: 'vat_rate', label: 'Thuế suất', width: 110 },
  { key: 'amount_before_tax', label: 'Trước thuế (VND)', width: 150, type: 'currency' },
  { key: 'tax_amount', label: 'Tiền thuế (VND)', width: 140, type: 'currency' },
  { key: '_after', label: 'Sau thuế (VND)', width: 150, type: 'currency', format: (i) => formatCurrency(itemAfterTax(i)) },
  { key: '_installments', label: 'Đợt thu', width: 120, align: 'right' },
]

const table = ref<DataTableExpose | null>(null)
function exportExcel() {
  table.value?.exportExcel(`hop-dong-${new Date().toISOString().slice(0, 10)}`)
}
</script>

<template>
  <SplitLayout :searching="list.loading" @search="search">
    <template #group>
      <GroupTree v-model="draft.groups" :nodes="groupTree(allForTree.data ?? [], today)" />
    </template>
    <template #filters>
      <FnField v-model="draft.contractNo" field="f-contract-no" label="Số hợp đồng" />
      <FnField v-model="draft.customer" field="f-customer" label="Khách hàng" type="select" :options="customerOptions" />
      <FnField v-model="draft.responsibleUser" field="f-responsible" label="Người phụ trách" type="select" :options="userOptions" />
      <FnField v-model="draft.contractType" field="f-contract-type" label="Loại hợp đồng" type="select" :options="typeOptions" />
      <FnField v-model="draft.onlyOutstanding" field="f-only-outstanding" label="Chỉ hợp đồng còn phải thu" type="checkbox" />
      <button type="button" class="text-base text-ink-blue-link hover:underline" @click="clearAll">Xóa bộ lọc</button>
    </template>

    <PageTitle title="Hợp đồng" :count="tableRows.length" :subtitle="`${tableRows.length} hợp đồng`">
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

    <p v-if="overdue.error" class="rounded-4 border border-outline-red-3 bg-surface-red-2 px-3 py-2 text-base text-ink-red-7" role="alert">
      Không tải được lịch thu: {{ overdue.error.message }}
      <button type="button" class="ml-2 underline" @click="overdue.reload()">Thử lại</button>
    </p>
    <p v-else-if="overdueTruncated" class="rounded-4 border border-outline-amber-3 bg-surface-amber-2 px-3 py-2 text-base text-ink-amber-7" role="alert">
      Có quá nhiều đợt quá hạn nên chưa tính được số đợt quá hạn. Hãy lọc bớt hợp đồng rồi thử lại.
    </p>
    <p v-if="schedules.error" class="rounded-4 border border-outline-red-3 bg-surface-red-2 px-3 py-2 text-base text-ink-red-7" role="alert">
      Không tải được lịch thu của hợp đồng đang chọn: {{ schedules.error.message }}
      <button type="button" class="ml-2 underline" @click="schedules.reload()">Thử lại</button>
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
      <template #cell-_party="{ row }">
        <div class="min-w-0">
          <div class="truncate text-base-semibold text-ink-gray-9">{{ partyLines(row).top }}</div>
          <div class="truncate text-sm text-ink-gray-5">{{ partyLines(row).bottom }}</div>
        </div>
      </template>
      <template #cell-_effective="{ row }">
        <div>
          <div class="whitespace-nowrap text-base text-ink-gray-8">{{ effectiveText(row) }}</div>
          <div class="text-sm" :class="(row.end_date ?? '9999') < today ? 'text-ink-red-7' : 'text-ink-gray-5'">
            {{ remainingText(row.end_date, today) }}
          </div>
        </div>
      </template>
      <template #cell-outstanding_amount="{ row }">
        <div class="text-right">
          <div class="tabular-nums" :class="Number(row.outstanding_amount ?? 0) > 0 ? 'text-ink-amber-7' : 'text-ink-gray-8'">
            {{ formatCurrency(row.outstanding_amount) }}
          </div>
          <div
            class="ml-auto mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-gray-3"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="collectedPercent(row.paid_amount, row.total_after_tax)"
            :aria-label="`Đã thu ${collectedPercent(row.paid_amount, row.total_after_tax)}%`"
          >
            <div class="h-full rounded-full bg-surface-green-5" :style="{ width: `${collectedPercent(row.paid_amount, row.total_after_tax)}%` }" />
          </div>
        </div>
      </template>
      <template #cell-_actions="{ row }">
        <Tooltip text="Sửa">
          <Button
            size="sm"
            variant="ghost"
            icon="lucide-pencil"
            aria-label="Sửa"
            :route="`/contracts/${encodeURIComponent(row.name)}/edit`"
            @click.stop
          />
        </Tooltip>
      </template>
    </DataTable>
    <p v-if="!list.loading && !list.error && !rows.length" class="text-base text-ink-gray-5">
      Chưa có hợp đồng. Bấm Thêm hợp đồng để tạo.
    </p>

    <DetailPanel v-if="current" :title="detailTitle(current)" :fields="fields" @close="selected = null">
      <template #badge>
        <StatusBadge :status="statusOf(current)" />
      </template>
      <template #aside>
        <StatCards :cards="asideCardList" />
      </template>
      <template #actions>
        <Button
          size="sm"
          variant="outline"
          icon-left="lucide-file-plus"
          label="Tạo đề nghị thanh toán"
          :route="`/payment-requests/new?contract=${encodeURIComponent(current.name)}`"
        />
        <Button
          size="sm"
          variant="outline"
          icon-left="lucide-pencil"
          label="Cập nhật"
          :route="`/contracts/${encodeURIComponent(current.name)}/edit`"
        />
      </template>
      <h3 class="mb-2 text-base-semibold text-ink-gray-8">Hạng mục</h3>
      <MiniTable :columns="ITEM_COLUMNS" :rows="detailItems" :totals="itemTotalsRow" empty-text="Hợp đồng chưa có hạng mục.">
        <template #cell-_billing="{ row }">
          <span class="inline-flex flex-wrap items-center gap-1.5">
            {{ row.billing_type }}
            <StatusBadge v-if="badgeOf(row)" :status="{ label: badgeOf(row) as string, icon: 'lucide-repeat', tone: 'blue' }" />
          </span>
        </template>
        <template #cell-_installments="{ row }">{{ installmentOf(row as ContractItem) }}</template>
      </MiniTable>
    </DetailPanel>
  </SplitLayout>
</template>
