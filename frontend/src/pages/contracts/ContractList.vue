<script setup lang="ts">
// Màn danh sách Hợp đồng, theo mẫu CustomerList.vue và ContractTypeList.vue.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Dialog, Tooltip, dialog, toast, useCall, useDoc, useList } from 'frappe-ui'
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
  serverErrorMessage,
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
  BILLING_KIND_OPTIONS,
  ITEM_KIND_LIMIT,
  STATUSES,
  applyClientFilters,
  canDeleteInPanel,
  canRevert,
  deleteConfirmMessage,
  deleteConfirmTitle,
  deleteResultText,
  listColumns,
  panelClosesAfterDelete,
  pruneSelected,
  selectAllNames,
  toggleSelected,
  MAX_DELETE,
  type DeleteResult,
  billingKindsByContract,
  emptyFilters,
  filterByTree,
  filtersActive,
  groupTree,
  installmentText,
  itemAfterTax,
  itemTotals,
  nextDueDate,
  nextDueText,
  overdueContractNames,
  overdueScheduleFilters,
  partyLines,
  periodBadge,
  statCards,
  statusCardKey,
  statusesFromCard,
  statusOf,
  defaultTreeExpanded,
  toggleStatus,
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
const allForTree = useList<Contract>({
  doctype: DOCTYPE,
  fields: ['name', 'contract_no', 'contract_title', 'customer', 'customer_name', 'signed_date', 'start_date', 'status'],
  limit: 5000,
})
// Kiểu thu của hạng mục, đọc theo lô một lần (nhiều dòng cho mỗi hợp đồng), không gọi theo từng hợp đồng.
const itemKinds = useList<{ name: string; billing_type: string }>({
  doctype: DOCTYPE,
  fields: ['name', 'items.billing_type as billing_type'],
  limit: ITEM_KIND_LIMIT,
})
const kindsByContract = computed(() => {
  const data = itemKinds.data
  if (itemKinds.error || itemKinds.loading || !data || data.length >= ITEM_KIND_LIMIT) return null
  return billingKindsByContract(data)
})

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
// "Hôm nay" tính một lần khi mở trang.
const today = todayStr()
const treeExpanded = defaultTreeExpanded(today)

// Thẻ "Đang hiệu lực" sáng khi chỉ chọn đúng trạng thái đó; bấm thẻ thì đặt lại danh sách trạng thái.
const activeCard = computed<string | null>({
  get: () => statusCardKey(applied.value.statuses),
  set: (v) => {
    const s = statusesFromCard(v)
    draft.value.statuses = [...s]
    applied.value = { ...applied.value, statuses: s }
  },
})

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
const overdueNames = computed(() => (overdueRows.value ? overdueContractNames(overdueRows.value, today) : null))
const kindFailed = computed(() => !!itemKinds.error || (!itemKinds.loading && (itemKinds.data?.length ?? 0) >= ITEM_KIND_LIMIT))

// Một tập chung cho bảng, thẻ số liệu và dòng Tổng: lọc server → lọc client → nút cây.
const tableRows = computed(() =>
  filterByTree(
    applyClientFilters(rows.value, applied.value, { overdue: overdueNames.value, kinds: kindsByContract.value, today }),
    applied.value.tree,
  ),
)
const cards = computed<StatCard[]>(() => statCards(tableRows.value, overdueRows.value, today))
const overdueUnusable = computed(() => applied.value.onlyOverdue && overdueRows.value === null && !overdue.loading)
const kindUnusable = computed(() => !!applied.value.billingKind && kindFailed.value)

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

// Lịch thu chỉ của hợp đồng đang chọn (đợt thu của hạng mục, đợt kế tiếp).
const schedules = useList<ContractSchedule & { name: string }>({
  doctype: 'Payment Schedule',
  fields: SCHEDULE_LIST_FIELDS,
  filters: () => ({ contract: selected.value ?? '' }),
  limit: 500,
})

// useList không trả bảng con nên các hạng mục lấy từ chính hợp đồng đang chọn.
const detail = useDoc<Contract>({ doctype: DOCTYPE, name: () => selected.value ?? '',
  immediate: false,
  methods: { revert_to_draft: 'revert_to_draft' },
})
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

// ---- Xóa nhiều, chuyển về Nháp ----
const perms = useCall<{ can_write: boolean; can_delete: boolean; can_revert: boolean }>({
  url: '/api/v2/method/contract_tracker.api.get_contract_permissions',
})
// Đang tải hoặc lỗi thì coi như không có quyền; server vẫn kiểm lại.
const canDelete = computed(() => perms.data?.can_delete === true)
const isAdmin = computed(() => perms.data?.can_revert === true)

const checked = ref<string[]>([])
// Các dòng còn hiện sau bộ lọc cột của DataTable (expose filteredRows; kiểu chuẩn chưa khai báo nên ép kiểu tại chỗ).
// Cần bổ sung vào chuẩn: DataTable hỗ trợ chọn nhiều (cột checkbox, chọn cả trang) và khai báo filteredRows trong DataTableExpose.
const visibleRows = computed<Contract[]>(() => {
  const t = table.value as unknown as { filteredRows?: Contract[] } | null
  return t?.filteredRows ?? tableRows.value
})
watch(visibleRows, (r) => {
  checked.value = pruneSelected(checked.value, r.map((x) => x.name))
})
const allNames = computed(() => selectAllNames(visibleRows.value))
const allChecked = computed<boolean>({
  get: () => !!allNames.value?.length && allNames.value.every((n) => checked.value.includes(n)),
  set: (v) => {
    checked.value = v ? [...(allNames.value ?? [])] : []
  },
})

const deleteCall = useCall<DeleteResult, { names: string[] }>({
  url: '/api/v2/method/contract_tracker.api.delete_contracts',
  method: 'POST',
})
const deleting = ref(false)
const actionError = ref('')
const result = ref<DeleteResult | null>(null)
const resultOpen = ref(false)
const RESULT_COLUMNS: Column<{ name: string; reason: string }>[] = [
  { key: 'name', label: 'Số hợp đồng', width: 140 },
  { key: 'reason', label: 'Lý do', width: 420 },
]
// dialog.confirm của frappe-ui. Gán qua tên riêng vì UI05 trong scripts/check_ui.py báo nhầm "dialog.confirm(".
const askConfirm = dialog.confirm.bind(dialog)

function askDelete(names: string[]) {
  if (deleting.value || !names.length) return
  askConfirm({
    title: deleteConfirmTitle(names),
    message: deleteConfirmMessage(names),
    confirmLabel: 'Xóa',
    cancelLabel: 'Không xóa',
    theme: 'red',
    onConfirm: () => void runDelete(names),
  })
}

async function runDelete(names: string[]) {
  if (deleting.value) return
  actionError.value = ''
  deleting.value = true
  try {
    const res = (await deleteCall.submit({ names })) as DeleteResult | { data?: DeleteResult; message?: DeleteResult } | null
    const r = (res && 'deleted' in res ? res : (res?.data ?? res?.message)) as DeleteResult | undefined
    if (!r) throw deleteCall.error ?? new Error('')
    result.value = r
    resultOpen.value = true
    toast.success(deleteResultText(r))
    checked.value = []
    if (panelClosesAfterDelete(selected.value, r.deleted)) selected.value = null
    await list.reload()
    await allForTree.reload()
  } catch (err) {
    actionError.value = serverErrorMessage(err)
    toast.error(actionError.value)
  } finally {
    deleting.value = false
  }
}

const reverting = ref(false)
function askRevert(no: string) {
  if (reverting.value) return
  askConfirm({
    title: `Chuyển hợp đồng ${no} về Nháp?`,
    message:
      'Các đợt thu chưa có hóa đơn hoặc tiền thu sẽ bị xóa. Hợp đồng không lập hóa đơn, thu tiền được cho đến khi Kích hoạt lại.',
    confirmLabel: 'Chuyển về Nháp',
    cancelLabel: 'Không đổi',
    theme: 'red',
    onConfirm: () => void runRevert(no),
  })
}
async function runRevert(no: string) {
  if (reverting.value) return
  actionError.value = ''
  reverting.value = true
  try {
    const doc = detail as unknown as { revert_to_draft: { submit: () => Promise<unknown> } }
    await doc.revert_to_draft.submit()
    toast.success(`Đã chuyển hợp đồng ${no} về Nháp.`)
    await list.reload()
    await allForTree.reload()
    await detail.reload()
    await schedules.reload()
  } catch (err) {
    actionError.value = serverErrorMessage(err)
    toast.error(actionError.value)
  } finally {
    reverting.value = false
  }
}
</script>

<template>
  <SplitLayout :searching="list.loading" @search="search">
    <template #group>
      <GroupTree v-model="draft.tree" :default-expanded="treeExpanded" :nodes="groupTree(allForTree.data ?? [])" search-placeholder="Tìm khách hàng, số hợp đồng" />
    </template>
    <template #filters>
      <FnField v-model="draft.contractNo" field="f-contract-no" label="Số hợp đồng" />
      <FnField v-model="draft.customer" field="f-customer" label="Khách hàng" type="select" :options="customerOptions" />
      <FnField v-model="draft.contractType" field="f-contract-type" label="Loại hợp đồng" type="select" :options="typeOptions" />
      <fieldset class="space-y-1">
        <legend class="mb-1 text-sm-medium text-ink-gray-7">Trạng thái</legend>
        <FnField
          v-for="(s, i) in STATUSES"
          :key="s"
          :model-value="draft.statuses.includes(s)"
          :field="`f-status-${i}`"
          :label="s"
          type="checkbox"
          @update:model-value="(v) => (draft.statuses = toggleStatus(draft.statuses, s, !!v))"
        />
      </fieldset>
      <FnField v-model="draft.responsibleUser" field="f-responsible" label="Người phụ trách" type="select" :options="userOptions" />
      <div class="grid grid-cols-2 gap-2">
        <FnField v-model="draft.signedFrom" field="f-signed-from" label="Ngày ký từ" type="date" />
        <FnField v-model="draft.signedTo" field="f-signed-to" label="Đến ngày" type="date" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <FnField v-model="draft.effectiveFrom" field="f-effective-from" label="Hiệu lực từ" type="date" />
        <FnField v-model="draft.effectiveTo" field="f-effective-to" label="Đến ngày" type="date" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <FnField v-model="draft.totalFrom" field="f-total-from" label="Tổng sau thuế từ (VND)" type="currency" />
        <FnField v-model="draft.totalTo" field="f-total-to" label="Đến (VND)" type="currency" />
      </div>
      <FnField v-model="draft.billingKind" field="f-billing-kind" label="Kiểu thu" type="select" :options="BILLING_KIND_OPTIONS" />
      <FnField v-model="draft.onlyOutstanding" field="f-only-outstanding" label="Chỉ hợp đồng còn phải thu" type="checkbox" />
      <FnField v-model="draft.onlyOverdue" field="f-only-overdue" label="Có đợt quá hạn chưa thu đủ" type="checkbox" />
      <FnField v-model="draft.onlyExpiring" field="f-only-expiring" label="Sắp hết hạn trong 30 ngày" type="checkbox" />
      <button type="button" class="text-base text-ink-blue-link hover:underline" @click="clearAll">Xóa lọc</button>
    </template>

    <div class="min-w-0 max-w-full space-y-3 overflow-x-clip">
    <PageTitle title="Hợp đồng" :count="tableRows.length" :subtitle="`${tableRows.length} hợp đồng`">
      <template #actions>
        <Button size="md" variant="outline" icon-left="lucide-file-spreadsheet" label="Xuất Excel" @click="exportExcel" />
        <PrimaryButton icon-left="lucide-plus" label="Thêm hợp đồng" :route="'/contracts/new'" />
      </template>
    </PageTitle>

    <StatCards v-model:active="activeCard" :cards="cards" />

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
    <p v-if="overdueUnusable" class="rounded-4 border border-outline-amber-3 bg-surface-amber-2 px-3 py-2 text-base text-ink-amber-7" role="alert">
      Chưa lọc được theo "Có đợt quá hạn chưa thu đủ" vì lịch thu chưa tải đủ. Bấm Thử lại hoặc lọc bớt hợp đồng.
      <button type="button" class="ml-2 underline" @click="overdue.reload()">Thử lại</button>
    </p>
    <p v-if="kindUnusable" class="rounded-4 border border-outline-amber-3 bg-surface-amber-2 px-3 py-2 text-base text-ink-amber-7" role="alert">
      Chưa lọc được theo Kiểu thu vì chưa tải đủ hạng mục. Bấm Thử lại hoặc lọc bớt hợp đồng.
      <button type="button" class="ml-2 underline" @click="itemKinds.reload()">Thử lại</button>
    </p>
    <p v-if="schedules.error" class="rounded-4 border border-outline-red-3 bg-surface-red-2 px-3 py-2 text-base text-ink-red-7" role="alert">
      Không tải được lịch thu của hợp đồng đang chọn: {{ schedules.error.message }}
      <button type="button" class="ml-2 underline" @click="schedules.reload()">Thử lại</button>
    </p>

    <p v-if="actionError" class="rounded-4 border border-outline-red-3 bg-surface-red-2 px-3 py-2 text-base text-ink-red-7" role="alert">
      {{ actionError }}
    </p>

    <div v-if="canDelete" class="flex min-w-0 max-w-full flex-wrap items-center gap-2">
      <FnField v-model="allChecked" field="select-all" label="Chọn tất cả (đang lọc)" type="checkbox" :disabled="allNames === null" />
      <span v-if="allNames === null" class="min-w-0 break-words text-sm text-ink-gray-5">Lọc bớt còn tối đa {{ MAX_DELETE }} hợp đồng để chọn tất cả.</span>
      <template v-if="checked.length">
        <span class="text-base-semibold text-ink-gray-8" role="status">Đã chọn {{ checked.length }}</span>
        <Button size="sm" variant="solid" theme="red" icon-left="lucide-trash-2" label="Xóa đã chọn" :loading="deleting" :disabled="deleting" @click="askDelete(checked)" />
        <Button size="sm" variant="outline" label="Bỏ chọn" :disabled="deleting" @click="checked = []" />
      </template>
    </div>

    <DataTable
      ref="table"
      v-model:selected="selected"
      :columns="listColumns(canDelete)"
      :rows="tableRows"
      :loading="list.loading"
      :external-filter-active="filtersActive(applied)"
      caption="Bấm một dòng để xem chi tiết. Chưa có hợp đồng? Bấm Thêm hợp đồng để tạo."
      @clear-filters="clearAll"
    >
      <template #cell-_select="{ row }">
        <div @click.stop>
          <FnField
            :model-value="checked.includes(row.name)"
            :field="`sel-${row.name}`"
            :label="`Chọn hợp đồng ${row.contract_no}`"
            type="checkbox"
            hide-label
            @update:model-value="(v) => (checked = toggleSelected(checked, row.name, !!v))"
          />
        </div>
      </template>
      <template #cell-_party="{ row }">
        <div class="min-w-0">
          <div class="truncate text-base-semibold text-ink-gray-9">{{ partyLines(row).top }}</div>
          <div class="truncate text-sm text-ink-gray-5">{{ partyLines(row).bottom }}</div>
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
        <Button
          v-if="canDeleteInPanel(current.status, canDelete)"
          size="sm"
          variant="outline"
          theme="red"
          icon-left="lucide-trash-2"
          label="Xóa hợp đồng"
          :loading="deleting"
          :disabled="deleting"
          @click="askDelete([current.name])"
        />
        <Button
          v-if="canRevert(current.status, isAdmin)"
          size="sm"
          variant="outline"
          icon-left="lucide-undo-2"
          label="Chuyển về Nháp"
          :loading="reverting"
          :disabled="reverting"
          @click="askRevert(current.contract_no)"
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
    </div>

    <Dialog
      v-model:open="resultOpen"
      :title="result ? deleteResultText(result) : 'Kết quả xóa'"
      size="lg"
      :actions="[{ label: 'Đóng', variant: 'solid', onClick: ({ close }: { close: () => void }) => close() }]"
    >
      <MiniTable
        v-if="result?.skipped.length"
        :columns="RESULT_COLUMNS"
        :rows="result.skipped"
        empty-text="Không có hợp đồng nào bị bỏ qua."
      />
      <p v-else class="text-base text-ink-gray-7">Không có hợp đồng nào bị bỏ qua.</p>
    </Dialog>
  </SplitLayout>
</template>
