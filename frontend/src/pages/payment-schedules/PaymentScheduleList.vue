<script setup lang="ts">
// Màn Lịch thu tiền toàn công ty (chỉ đọc), theo mẫu ContractList.vue.
// Chuẩn chưa có DataTable chọn nhiều dòng: dùng cột "Chọn" bằng FnField checkbox.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, toast, useCall, useList } from 'frappe-ui'
import {
  DataTable,
  DetailPanel,
  FnField,
  GroupTree,
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
import { periodText } from '@/pages/contracts/contract'
import {
  DOCTYPE,
  LIMIT,
  LIST_FIELDS,
  MSG_EMPTY,
  MSG_LIMIT,
  MSG_SAME_CUSTOMER,
  ORDER_BY,
  actionState,
  applyQuick,
  canPick,
  emptyFilters,
  filtersActive,
  groupTree,
  makeColumns,
  outstandingOf,
  periodRange,
  quickCards,
  statCards,
  toFrappeFilters,
  toScheduleQuery,
  togglePick,
  todayStr,
  type PanelFilters,
  type ScheduleListRow,
} from './paymentSchedule'

const route = useRoute()
const router = useRouter()

const draft = ref<PanelFilters>(emptyFilters())
const applied = ref<PanelFilters>(emptyFilters())

// Cây nhóm: toàn bộ đợt (không lọc) để có đủ khách hàng và số lượng.
const allForTree = useList<ScheduleListRow>({
  doctype: DOCTYPE,
  fields: ['name', 'customer', 'customer_name'],
  limit: LIMIT,
})
const allCustomers = computed(() => [...new Set((allForTree.data ?? []).map((r) => r.customer))])
// Lần đầu có dữ liệu cây thì tích hết khách hàng.
let treeReady = false
watch(allCustomers, (list) => {
  if (treeReady || !list.length) return
  treeReady = true
  draft.value.groups = [...list]
  applied.value.groups = [...list]
})

const list = useList<ScheduleListRow>({
  doctype: DOCTYPE,
  fields: LIST_FIELDS,
  filters: () => toFrappeFilters(applied.value, allCustomers.value),
  orderBy: ORDER_BY,
  limit: LIMIT,
})
const rows = computed(() => list.data ?? [])
watch(
  () => rows.value.length,
  (n) => {
    if (n >= LIMIT) toast.warning(MSG_LIMIT)
  },
)

// Lựa chọn cho các ô lọc.
const customers = useList<ContractCustomer>({ doctype: 'Contract Customer', fields: ['name', 'customer_name'], orderBy: 'customer_name asc', limit: 5000 })
const contracts = useList<{ name: string }>({ doctype: 'Contract', fields: ['name'], orderBy: 'name asc', limit: 5000 })
const users = useCall<{ name: string; full_name: string }[]>({ url: '/api/v2/method/contract_tracker.api.get_responsible_users' })
const perms = useCall<{ invoice_write: boolean; receipt_write: boolean }>({ url: '/api/v2/method/contract_tracker.api.get_billing_permissions' })
const userList = computed(() => (Array.isArray(users.data) ? users.data : []))
const customerOptions = computed<SelectOption[]>(() => (customers.data ?? []).map((c) => ({ label: c.customer_name, value: c.name })))
const contractOptions = computed<SelectOption[]>(() => (contracts.data ?? []).map((c) => ({ label: c.name, value: c.name })))
const userOptions = computed<SelectOption[]>(() => userList.value.map((u) => ({ label: u.full_name || u.name, value: u.name })))
const userName = (user: string) => {
  const u = userList.value.find((x) => x.name === user)
  return u?.full_name || user
}
const columns = computed(() => makeColumns(userName))

// Lọc nhanh (chọn một, bấm lại để bỏ). Hàng thẻ số liệu và hàng lọc nhanh dùng chung một lựa chọn.
const quick = ref<string | null>(null)
const today = computed(() => todayStr())
const tableRows = computed(() => applyQuick(rows.value, quick.value, today.value))
const metricCards = computed(() => statCards(rows.value, periodRange(applied.value, today.value)))
const quickRow = computed(() => quickCards(rows.value, today.value))

function search() {
  applied.value = JSON.parse(JSON.stringify(draft.value)) as PanelFilters
}
function clearAll() {
  draft.value = { ...emptyFilters(), groups: [...allCustomers.value] }
  quick.value = null
  search()
}
const externalFilter = computed(() => filtersActive(applied.value, allCustomers.value) || quick.value !== null)

// Chọn nhiều đợt (cùng một khách hàng). Đợt bị lọc mất khỏi `rows` thì tự rơi khỏi lựa chọn.
const picked = ref<string[]>([])
const pickedRows = computed(() => rows.value.filter((r) => picked.value.includes(r.name)))
const pickedCustomer = computed(() => pickedRows.value[0]?.customer_name || pickedRows.value[0]?.customer || '')
function onPick(row: ScheduleListRow) {
  picked.value = togglePick(picked.value, row, pickedRows.value)
}
const state = computed(() => actionState(pickedRows.value))
const perm = computed(() => ({ invoice: perms.data?.invoice_write === true, receipt: perms.data?.receipt_write === true }))
const blockedReason = computed(() => {
  if (!pickedRows.value.length) return ''
  return [perm.value.invoice ? state.value.invoice.reason : '', perm.value.receipt ? state.value.receipt.reason : '']
    .filter(Boolean)
    .join(' ')
})
function record(kind: 'invoices' | 'receipts') {
  void router.push({ path: `/${kind}/new`, query: { schedules: toScheduleQuery(pickedRows.value.map((r) => r.name)) } })
}

// Dòng đang xem chi tiết, đồng bộ ?selected=.
const selected = ref<string | null>((route.query.selected as string) || null)
watch(selected, (v) => {
  void router.replace({ query: { ...route.query, selected: v ?? undefined } })
})
const current = computed(() => rows.value.find((r) => r.name === selected.value) ?? null)
const detailFields = computed<DetailField[]>(() => {
  const r = current.value
  if (!r) return []
  return [
    { label: 'Số hợp đồng', value: r.contract },
    { label: 'Khách hàng', value: r.customer_name },
    { label: 'Hạng mục', value: r.item_name },
    { label: 'Tên đợt', value: r.schedule_name },
    { label: 'Kỳ', value: periodText(r) },
    { label: 'Ngày đến hạn', value: formatDate(r.due_date) },
    { label: 'Trước thuế (VND)', value: formatCurrency(r.amount_before_tax) },
    { label: 'Thuế suất', value: r.vat_rate },
    { label: 'Tiền thuế (VND)', value: formatCurrency(r.tax_amount) },
    { label: 'Tổng tiền (VND)', value: formatCurrency(r.total_amount) },
    { label: 'Đã thu (VND)', value: formatCurrency(r.paid_amount) },
    { label: 'Còn nợ (VND)', value: formatCurrency(outstandingOf(r)) },
    { label: 'Nghiệm thu', value: r.requires_acceptance ? r.acceptance_status : 'Không cần' },
    { label: 'Đề nghị thanh toán', value: r.request_status },
    { label: 'Hóa đơn', value: r.invoice_status === 'Đã xuất' && r.invoice_no ? `Đã xuất ${r.invoice_no}` : r.invoice_status },
    { label: 'Thanh toán', value: r.payment_status },
    { label: 'Quá hạn', value: r.is_overdue ? 'Quá hạn' : 'Không' },
    { label: 'Người phụ trách', value: r.responsible_user ? userName(r.responsible_user) : '' },
  ]
})

const table = ref<DataTableExpose | null>(null)
function exportExcel() {
  table.value?.exportExcel(`lich-thu-${todayStr()}`)
}
</script>

<template>
  <SplitLayout :searching="list.loading" @search="search">
    <template #group>
      <GroupTree v-model="draft.groups" :nodes="groupTree(allForTree.data ?? [])" />
    </template>
    <template #filters>
      <FnField v-model="draft.dueFrom" field="f-due-from" label="Đến hạn từ ngày" type="date" />
      <FnField v-model="draft.dueTo" field="f-due-to" label="Đến hạn đến ngày" type="date" />
      <FnField v-model="draft.customer" field="f-customer" label="Khách hàng" type="select" :options="customerOptions" />
      <FnField v-model="draft.responsibleUser" field="f-responsible" label="Người phụ trách" type="select" :options="userOptions" />
      <FnField v-model="draft.contract" field="f-contract" label="Hợp đồng" type="select" :options="contractOptions" />
      <button type="button" class="text-base text-ink-blue-link hover:underline" @click="clearAll">Xóa bộ lọc</button>
    </template>

    <PageTitle title="Lịch thu tiền" :count="tableRows.length">
      <template #actions>
        <Button size="md" variant="outline" icon-left="lucide-file-spreadsheet" label="Xuất Excel" @click="exportExcel" />
        <Button
          v-if="perm.invoice"
          size="md"
          variant="outline"
          icon-left="lucide-receipt-text"
          label="Ghi nhận hóa đơn"
          :disabled="!state.invoice.enabled"
          :title="state.invoice.reason"
          @click="record('invoices')"
        />
        <PrimaryButton
          v-if="perm.receipt"
          icon-left="lucide-wallet"
          label="Ghi nhận thu tiền"
          :disabled="!state.receipt.enabled"
          :title="state.receipt.reason"
          @click="record('receipts')"
        />
      </template>
    </PageTitle>
    <p v-if="blockedReason" class="text-sm text-ink-gray-6">{{ blockedReason }}</p>

    <StatCards v-model:active="quick" :cards="metricCards" />
    <StatCards v-model:active="quick" :cards="quickRow" />

    <p v-if="list.error" class="rounded-4 border border-outline-red-3 bg-surface-red-2 px-3 py-2 text-base text-ink-red-7" role="alert">
      Không tải được danh sách: {{ list.error.message }}
      <button type="button" class="ml-2 underline" @click="list.reload()">Thử lại</button>
    </p>

    <p v-if="pickedRows.length" class="text-sm text-ink-gray-7">
      Đã chọn {{ pickedRows.length }} đợt của {{ pickedCustomer }}. {{ MSG_SAME_CUSTOMER }}
      <button type="button" class="ml-1 text-ink-blue-link hover:underline" @click="picked = []">Bỏ chọn</button>
    </p>

    <DataTable
      ref="table"
      v-model:selected="selected"
      :columns="columns"
      :rows="tableRows"
      :loading="list.loading"
      :external-filter-active="externalFilter"
      :caption="rows.length ? 'Bấm một dòng để xem chi tiết. Tích ô Chọn để ghi nhận hóa đơn hoặc thu tiền.' : MSG_EMPTY"
      @clear-filters="clearAll"
    >
      <template #cell-_pick="{ row }">
        <span :title="canPick(row, pickedRows) ? undefined : MSG_SAME_CUSTOMER" @click.stop>
          <FnField
            :model-value="picked.includes(row.name)"
            :field="`pick-${row.name}`"
            label="Chọn"
            type="checkbox"
            :disabled="!canPick(row, pickedRows)"
            @update:model-value="onPick(row)"
          />
        </span>
      </template>
    </DataTable>
    <p v-if="!list.loading && !list.error && !rows.length" class="text-base text-ink-gray-5">{{ MSG_EMPTY }}</p>

    <DetailPanel v-if="current" :title="`${current.contract} — ${current.schedule_name ?? ''}`" :fields="detailFields" @close="selected = null">
      <template #actions>
        <Button
          size="sm"
          variant="outline"
          icon-left="lucide-external-link"
          label="Mở hợp đồng"
          :route="`/contracts/${encodeURIComponent(current.contract)}/edit`"
        />
      </template>
    </DetailPanel>
  </SplitLayout>
</template>
