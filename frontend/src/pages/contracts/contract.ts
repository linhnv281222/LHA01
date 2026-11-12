// Logic (không giao diện) của màn Hợp đồng: trạng thái, cột bảng, nhóm, bộ lọc, quy tắc kiểm tra, chuyển dữ liệu form <-> server.
// Quy tắc kiểm tra và câu báo lỗi khớp với contract_tracker/doctype/contract/contract.py.
import type { Contract, ContractItem, ContractMilestone } from '@/types/doctypes'
import {
  COMMON_STATUS,
  checkField,
  formatCurrency,
  formatDate,
  formatNumber,
  lowerFirst,
  type Column,
  type DetailField,
  type Rules,
  type StatCard,
  type StatusDef,
  type TreeNode,
} from '@/standard'
import { todayStr } from '@/pages/payment-schedules/paymentSchedule'

export const DOCTYPE = 'Contract'

export type { Contract, ContractItem, ContractMilestone } from '@/types/doctypes'

// ---- Trạng thái ----

export const STATUSES = ['Nháp', 'Đang hiệu lực', 'Hết hạn', 'Đã thanh lý', 'Đã hủy'] as const
export type ContractStatus = (typeof STATUSES)[number]

export const CONTRACT_STATUS: Record<ContractStatus, StatusDef> = {
  'Nháp': COMMON_STATUS.draft,
  'Đang hiệu lực': { label: 'Đang hiệu lực', icon: 'lucide-circle-check', tone: 'green' },
  'Hết hạn': COMMON_STATUS.expired,
  'Đã thanh lý': { label: 'Đã thanh lý', icon: 'lucide-archive', tone: 'blue' },
  'Đã hủy': { label: 'Đã hủy', icon: 'lucide-ban', tone: 'gray' },
}

export function statusOf(row: Pick<Contract, 'status'>): StatusDef | undefined {
  return CONTRACT_STATUS[(row.status ?? 'Nháp') as ContractStatus]
}

export const canActivate = (status: string | undefined | null) => status === 'Nháp'
export const canCancel = (status: string | undefined | null) => status === 'Nháp' || status === 'Đang hiệu lực'
export const canLiquidate = (status: string | undefined | null) => status === 'Đang hiệu lực'
export const isLocked = (status: string | undefined | null) =>
  status === 'Hết hạn' || status === 'Đã thanh lý' || status === 'Đã hủy'

/** "Đã hủy" → "hủy", "Hết hạn" → "hết hạn" (ghép vào "đã ..."). */
export function statusWord(status: string): string {
  return lowerFirst(status.replace(/^Đã /, ''))
}

export function lockedMessage(status: string): string {
  return `Hợp đồng đã ${statusWord(status)}, không sửa được.`
}

// ---- Thông báo (chép y nguyên từ contract.py) ----

export const MSG_DUPLICATE = 'Số hợp đồng {0} đã tồn tại.'
export const MSG_END_REQUIRED = 'Hợp đồng có hạng mục Định kỳ nên phải nhập ngày kết thúc.'
export const MSG_END_BEFORE_START = 'Ngày kết thúc phải từ ngày bắt đầu trở đi.'
export const MSG_NO_ITEMS = 'Hợp đồng chưa có hạng mục, không kích hoạt được.'
export const MSG_ITEM_REQUIRED = 'Hạng mục dòng {0}: vui lòng nhập {1}.'
export const MSG_ITEM_POSITIVE = 'Hạng mục dòng {0}: {1} phải lớn hơn 0.'
export const MSG_ITEM_NO_MILESTONE = 'Hạng mục dòng {0}: cần ít nhất 1 mốc thanh toán.'
export const MSG_ITEM_PERIOD_END = 'Hạng mục dòng {0}: ngày kết thúc kỳ phải từ ngày bắt đầu kỳ đầu trở đi.'
export const MSG_ITEM_CREDIT_DAYS = 'Hạng mục dòng {0}: số ngày được nợ phải là số nguyên từ 0 trở lên.'
export const MSG_MILESTONE_REQUIRED = 'Hạng mục dòng {0}, mốc {1}: vui lòng nhập {2}.'
export const MSG_MILESTONE_POSITIVE = 'Hạng mục dòng {0}, mốc {1}: {2} phải lớn hơn 0.'
export const MSG_AMOUNT_MISMATCH = 'Hạng mục "{0}": tổng các mốc là {1}, giá trị hạng mục là {2}, đang lệch {3}.'
export const MSG_PERCENT_MISMATCH = 'Hạng mục "{0}": tổng phần trăm các mốc là {1}%, đang lệch {2}%.'

export function fmt(template: string, ...args: (string | number)[]): string {
  return template.replace(/\{(\d+)\}/g, (_m, i: string) => String(args[Number(i)] ?? ''))
}

// ---- Danh sách ----

export const EXPIRING_KEY = 'expiring'
export const EXPIRING_DAYS = 30
/** Sai số khi so sánh tiền (cùng mức với milestoneSummary). */
export const MONEY_EPS = 0.01
const NO_VALUE = 'Không có'

/** Số đợt thu tối đa tải về một lần; chạm mức này thì coi là chưa đủ dữ liệu. */
export const SCHEDULE_LIMIT = 5000

/** Bộ lọc server cho đợt quá hạn: đến hạn trước hôm nay và chưa thu đủ (không dùng IN theo tên hợp đồng). */
export const overdueScheduleFilters = (today: string = todayStr()): Record<string, [string, string]> => ({
  due_date: ['<', today],
  payment_status: ['!=', 'Đã thu'],
})

/** Lịch thu đủ dùng để tính số liệu: không lỗi, không đang tải và chưa chạm giới hạn. Ngược lại trả null. */
export function usableSchedules<T>(
  data: T[] | null | undefined,
  failed: boolean,
  loading: boolean,
  limit: number = SCHEDULE_LIMIT,
): T[] | null {
  if (failed || loading || !data || data.length >= limit) return null
  return data
}

export const COLUMNS: Column<Contract>[] = [
  { key: '_index', label: 'STT', width: 48, type: 'index', pin: 'left' },
  { key: 'contract_no', label: 'Số hợp đồng', width: 120, pin: 'left', required: true },
  { key: '_party', label: 'Khách hàng / Nội dung', width: 230, format: (r) => r.customer_name ?? '' },
  { key: 'contract_type_name', label: 'Loại hợp đồng', width: 170, hidden: true },
  {
    key: 'status',
    label: 'Trạng thái',
    width: 140,
    type: 'status',
    status: statusOf,
    filter: 'select',
    options: STATUSES.map((s) => ({ label: s, value: s })),
  },
  { key: 'signed_date', label: 'Ngày ký', width: 120, type: 'date', hidden: true },
  { key: '_effective', label: 'Hiệu lực', width: 170, format: (r) => effectiveText(r) },
  { key: 'total_before_tax', label: 'Giá trị trước thuế (VND)', width: 160, type: 'currency', sum: true, hidden: true },
  { key: 'total_after_tax', label: 'Tổng sau thuế (VND)', width: 140, type: 'currency', sum: true },
  { key: 'paid_amount', label: 'Đã thu (VND)', width: 140, type: 'currency', sum: true },
  { key: 'outstanding_amount', label: 'Còn phải thu (VND)', width: 140, type: 'currency', sum: true },
  { key: 'responsible_name', label: 'Phụ trách', width: 120 },
  { key: '_actions', label: 'Thao tác', width: 72, pin: 'right', sortable: false, filter: 'none', required: true },
]

/** Tỷ lệ đã thu (%), làm tròn nguyên, 0..100; tổng bằng 0 thì 0. */
export function collectedPercent(paid: number | null | undefined, total: number | null | undefined): number {
  const t = Number(total ?? 0)
  if (!(t > 0)) return 0
  return Math.min(100, Math.max(0, Math.round((Number(paid ?? 0) / t) * 100)))
}

/** Số ngày từ hôm nay đến ngày kết thúc (âm = đã qua); null khi chưa có ngày kết thúc. */
export function daysLeft(end: string | null | undefined, today: string = todayStr()): number | null {
  if (!end) return null
  return diffDays(parseIso(end), parseIso(today))
}

export function remainingText(end: string | null | undefined, today: string = todayStr()): string {
  const n = daysLeft(end, today)
  if (n === null) return 'chưa đặt'
  return n >= 0 ? `còn ${n} ngày` : `đã hết hạn ${-n} ngày`
}

/** "dd/mm/yyyy – dd/mm/yyyy". */
export function effectiveText(row: { start_date?: string | null; end_date?: string | null }): string {
  if (row.start_date && row.end_date) return `${formatDate(row.start_date)} – ${formatDate(row.end_date)}`
  if (row.start_date) return `Từ ${formatDate(row.start_date)}`
  if (row.end_date) return `Đến ${formatDate(row.end_date)}`
  return NO_VALUE
}

/** Hai dòng của ô "Khách hàng / Nội dung". */
export function partyLines(row: Pick<Contract, 'customer_name' | 'contract_title'>): { top: string; bottom: string } {
  return { top: row.customer_name ?? '', bottom: row.contract_title?.trim() ? row.contract_title : 'Chưa có nội dung' }
}

export function expiringRange(today: string = todayStr()): { from: string; to: string } {
  return { from: today, to: toIso(addDays(parseIso(today), EXPIRING_DAYS)) }
}

/** Đang hiệu lực và ngày kết thúc từ hôm nay đến hôm nay + 30 ngày (gồm hai đầu). */
export function isExpiringSoon(row: { status?: string | null; end_date?: string | null }, today: string = todayStr()): boolean {
  if (row.status !== 'Đang hiệu lực' || !row.end_date) return false
  const { from, to } = expiringRange(today)
  return row.end_date >= from && row.end_date <= to
}

export interface ContractSchedule {
  name?: string
  contract?: string | null
  item_key?: string | null
  due_date?: string | null
  total_amount?: number | null
  paid_amount?: number | null
  payment_status?: string | null
  is_overdue?: 0 | 1 | boolean | null
}

export const SCHEDULE_LIST_FIELDS: (keyof ContractSchedule)[] = ['name', 'contract', 'item_key', 'due_date', 'total_amount', 'paid_amount', 'payment_status', 'is_overdue']

/** Phần còn thiếu của một đợt thu. */
export const shortfall = (s: Pick<ContractSchedule, 'total_amount' | 'paid_amount'>): number =>
  Math.max(0, Number(s.total_amount ?? 0) - Number(s.paid_amount ?? 0))

/** Đợt quá hạn: due_date < hôm nay và còn thiếu; chỉ hợp đồng có trong `statusByContract` và không phải Nháp/Đã hủy. */
export function overdueSummary(
  schedules: ContractSchedule[],
  statusByContract: Record<string, string | null | undefined>,
  today: string = todayStr(),
): { count: number; amount: number } {
  let count = 0
  let amount = 0
  for (const s of schedules) {
    const status = s.contract ? statusByContract[s.contract] : undefined
    if (!status || status === 'Nháp' || status === 'Đã hủy') continue
    if (!s.due_date || s.due_date >= today || shortfall(s) <= MONEY_EPS) continue
    count += 1
    amount += shortfall(s)
  }
  return { count, amount }
}

/** Ngày đến hạn nhỏ nhất từ hôm nay trong các đợt chưa thu đủ; không có thì null. */
export function nextDueDate(schedules: ContractSchedule[], today: string = todayStr()): string | null {
  const dates = schedules
    .filter((s) => s.due_date && s.due_date >= today && shortfall(s) > MONEY_EPS)
    .map((s) => s.due_date as string)
    .sort()
  return dates[0] ?? null
}

export const nextDueText = (date: string | null): string => (date ? formatDate(date) : NO_VALUE)

/** Thẻ số liệu của danh sách, tính trên dữ liệu đã lọc. Thẻ "Đang hiệu lực" bấm được để lọc. */
export function statCards(
  rows: Pick<Contract, 'name' | 'status' | 'end_date' | 'total_after_tax' | 'paid_amount' | 'outstanding_amount'>[],
  schedules: ContractSchedule[] | null = null,
  today: string = todayStr(),
): StatCard[] {
  const sum = (pick: (r: (typeof rows)[number]) => number | null | undefined) =>
    rows.reduce((acc, r) => acc + Number(pick(r) ?? 0), 0)
  const active = rows.filter((r) => r.status === 'Đang hiệu lực').length
  const expiring = rows.filter((r) => isExpiringSoon(r, today)).length
  const totalPaid = sum((r) => r.paid_amount)
  let overdueHint = NO_VALUE
  if (schedules) {
    const byContract = Object.fromEntries(rows.map((r) => [r.name, r.status]))
    const o = overdueSummary(schedules, byContract, today)
    overdueHint = `${o.count} đợt quá hạn · ${formatCurrency(o.amount)}`
  }
  return [
    {
      key: 'Đang hiệu lực',
      label: 'Đang hiệu lực',
      value: `${active} / ${rows.length}`,
      hint: `${expiring} hợp đồng hết hạn trong ${EXPIRING_DAYS} ngày`,
      status: CONTRACT_STATUS['Đang hiệu lực'],
    },
    { key: 'total', label: 'Tổng giá trị sau thuế (VND)', value: formatCurrency(sum((r) => r.total_after_tax)) },
    {
      key: 'paid',
      label: 'Đã thu (VND)',
      value: formatCurrency(totalPaid),
      tone: 'green',
      progress: collectedPercent(totalPaid, sum((r) => r.total_after_tax)),
    },
    {
      key: 'outstanding',
      label: 'Còn phải thu (VND)',
      value: formatCurrency(sum((r) => r.outstanding_amount)),
      tone: 'amber',
      hint: overdueHint,
    },
  ]
}

/** Cây "Truy vấn nhóm": Tất cả hợp đồng → từng trạng thái; thêm nút gốc "Sắp hết hạn" (không cộng vào "Tất cả"). */
export function groupTree(rows: Pick<Contract, 'status' | 'end_date'>[], today: string = todayStr()): TreeNode[] {
  return [
    {
      key: 'all',
      label: 'Tất cả hợp đồng',
      icon: 'lucide-layers',
      count: rows.length,
      children: STATUSES.map((s) => ({
        key: s,
        label: s,
        icon: CONTRACT_STATUS[s].icon,
        count: rows.filter((r) => (r.status ?? 'Nháp') === s).length,
      })),
    },
    {
      key: EXPIRING_KEY,
      label: 'Sắp hết hạn',
      icon: 'lucide-alarm-clock',
      count: rows.filter((r) => isExpiringSoon(r, today)).length,
    },
  ]
}

/** Tích "Sắp hết hạn" thì bỏ mọi trạng thái; tích lại một trạng thái thì bỏ "Sắp hết hạn". */
export function normalizeGroups(next: string[], prev: string[]): string[] {
  if (!next.includes(EXPIRING_KEY)) return next
  if (!prev.includes(EXPIRING_KEY)) return [EXPIRING_KEY]
  const added = next.filter((k) => k !== EXPIRING_KEY && !prev.includes(k))
  return added.length ? next.filter((k) => k !== EXPIRING_KEY) : next
}

export interface PanelFilters {
  groups: string[]
  contractNo: string
  customer: string
  responsibleUser: string
  contractType: string
  onlyOutstanding: boolean
}

export function emptyFilters(): PanelFilters {
  return { groups: [...STATUSES], contractNo: '', customer: '', responsibleUser: '', contractType: '', onlyOutstanding: false }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFrappeFilters(f: PanelFilters, today: string = todayStr()): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: Record<string, any> = {}
  if (f.groups.includes(EXPIRING_KEY)) {
    const { from, to } = expiringRange(today)
    filters.status = 'Đang hiệu lực'
    filters.end_date = ['between', [from, to]]
  } else if (f.groups.length === 0) filters.name = ['in', []]
  else if (f.groups.length < STATUSES.length) filters.status = ['in', f.groups]
  if (f.contractNo.trim()) filters.contract_no = ['like', `%${f.contractNo.trim()}%`]
  if (f.customer) filters.customer = f.customer
  if (f.responsibleUser) filters.responsible_user = f.responsibleUser
  if (f.contractType) filters.contract_type = f.contractType
  if (f.onlyOutstanding) filters.outstanding_amount = ['>', 0]
  return filters
}

export function filtersActive(f: PanelFilters): boolean {
  const d = emptyFilters()
  return (
    f.contractNo !== d.contractNo ||
    f.customer !== d.customer ||
    f.responsibleUser !== d.responsibleUser ||
    f.contractType !== d.contractType ||
    f.onlyOutstanding !== d.onlyOutstanding ||
    f.groups.length !== d.groups.length ||
    f.groups.includes(EXPIRING_KEY)
  )
}

// ---- Chi tiết dòng chọn ----

export const detailTitle = (row: { contract_no: string; customer_name?: string | null }): string =>
  row.customer_name ? `${row.contract_no} · ${row.customer_name}` : row.contract_no

/** Các trường thông tin bên trái; ô trống để '' (DetailPanel tự hiện "Không có"). */
export function detailFields(row: Contract): DetailField[] {
  return [
    { label: 'Số hợp đồng', value: row.contract_no },
    { label: 'Khách hàng', value: row.customer_name ?? '' },
    { label: 'Loại hợp đồng', value: row.contract_type_name ?? '' },
    { label: 'Tên hợp đồng', value: row.contract_title ?? '' },
    { label: 'Người phụ trách', value: row.responsible_name ?? '' },
    { label: 'Ngày ký', value: row.signed_date ? formatDate(row.signed_date) : '' },
    { label: 'Ngày bắt đầu', value: row.start_date ? formatDate(row.start_date) : '' },
    { label: 'Ngày kết thúc', value: row.end_date ? formatDate(row.end_date) : '' },
    { label: 'Thời hạn còn lại', value: row.end_date ? remainingText(row.end_date) : '' },
    { label: 'Ghi chú', value: row.notes ?? '', wide: true },
  ]
}

export const PERIOD_LABEL: Record<string, string> = {
  'Tháng': 'Hàng tháng',
  'Quý': 'Hàng quý',
  '6 tháng': '6 tháng một lần',
  'Năm': 'Hàng năm',
}

/** "Hàng quý · 4 kỳ" cho hạng mục Định kỳ; hạng mục khác null. */
export function periodBadge(item: ContractItem, contractEnd?: string | null): string | null {
  if (item.billing_type !== 'Định kỳ') return null
  const end = item.period_end || contractEnd
  if (!item.period_start || !end) return null
  const label = item.period === 'Ngày' ? `Mỗi ${item.period_days ?? 0} ngày` : (PERIOD_LABEL[item.period ?? ''] ?? item.period ?? '')
  const n = recurringPeriods(item.period ?? '', item.period_start, end, item.period_days).length
  if (n === 0) return null
  return `${label} · ${n} kỳ`
}

/** "đã thu x/y" theo lịch thu của hạng mục; "Không có" khi chưa có đợt hoặc lịch thu chưa tải được. */
export function installmentText(itemKey: string | null | undefined, schedules: ContractSchedule[] | null): string {
  if (!schedules || !itemKey) return NO_VALUE
  const mine = schedules.filter((s) => s.item_key === itemKey)
  if (!mine.length) return NO_VALUE
  return `đã thu ${mine.filter((s) => shortfall(s) <= MONEY_EPS).length}/${mine.length}`
}

/** Ba thẻ số liệu trong khối tiền của chi tiết dòng chọn (StatCards). */
export function asideCards(
  row: Pick<Contract, 'total_after_tax' | 'total_tax' | 'paid_amount' | 'outstanding_amount'>,
  nextDueLabel: string,
): StatCard[] {
  const pct = collectedPercent(row.paid_amount, row.total_after_tax)
  return [
    { key: 'total', label: 'Tổng sau thuế (VND)', value: formatCurrency(row.total_after_tax), hint: `Tiền thuế: ${formatCurrency(row.total_tax)}` },
    { key: 'paid', label: 'Đã thu (VND)', value: formatCurrency(row.paid_amount), tone: 'green', progress: pct, hint: `Đã thu ${pct}%` },
    {
      key: 'outstanding',
      label: 'Còn phải thu (VND)',
      value: formatCurrency(row.outstanding_amount),
      tone: 'amber',
      hint: `Đến hạn đợt kế tiếp: ${nextDueLabel}`,
    },
  ]
}

export const itemAfterTax = (item: Pick<ContractItem, 'amount_before_tax' | 'tax_amount'>): number =>
  Number(item.amount_before_tax ?? 0) + Number(item.tax_amount ?? 0)

export function itemTotals(items: Pick<ContractItem, 'amount_before_tax' | 'tax_amount'>[]): {
  before: number
  tax: number
  after: number
} {
  const before = items.reduce((a, i) => a + Number(i.amount_before_tax ?? 0), 0)
  const tax = items.reduce((a, i) => a + Number(i.tax_amount ?? 0), 0)
  return { before, tax, after: before + tax }
}

// ---- Form ----

export type BillingType = 'Một lần' | 'Nhiều đợt' | 'Định kỳ'
export type MilestoneInput = 'Số tiền' | 'Phần trăm'

export const BILLING_TYPES: BillingType[] = ['Một lần', 'Nhiều đợt', 'Định kỳ']
export const MILESTONE_INPUTS: MilestoneInput[] = ['Số tiền', 'Phần trăm']
export const PERIODS = ['Tháng', 'Quý', '6 tháng', 'Năm', 'Ngày']
export const BILL_TIMINGS = ['Đầu kỳ', 'Cuối kỳ']

export interface MilestoneForm {
  milestone_name: string
  amount: number | null
  percent: number | null
  due_date: string
  requires_acceptance: boolean
}

export interface ItemForm {
  /** Mã cố định của hạng mục; mốc gắn với hạng mục qua mã này. */
  item_key: string
  item_name: string
  vat_rate: string
  billing_type: BillingType
  requires_acceptance: boolean
  // Một lần
  amount: number | null
  due_date: string
  // Nhiều đợt
  item_value: number | null
  milestone_input: MilestoneInput
  milestones: MilestoneForm[]
  // Định kỳ
  unit_price: number | null
  period: string
  period_days: number | null
  period_start: string
  period_end: string
  bill_timing: string
  credit_days: number | null
}

export interface ContractForm {
  contract_no: string
  customer: string
  contract_type: string
  contract_title: string
  responsible_user: string
  signed_date: string
  start_date: string
  end_date: string
  contract_file: string
  notes: string
  items: ItemForm[]
}

export function newItemKey(): string {
  return Math.random().toString(36).slice(2, 12).padEnd(10, '0')
}

export function emptyItem(): ItemForm {
  return {
    item_key: newItemKey(),
    item_name: '',
    vat_rate: '',
    billing_type: 'Một lần',
    requires_acceptance: true,
    amount: null,
    due_date: '',
    item_value: null,
    milestone_input: 'Số tiền',
    milestones: [],
    unit_price: null,
    period: '',
    period_days: null,
    period_start: '',
    period_end: '',
    bill_timing: 'Đầu kỳ',
    credit_days: 0,
  }
}

/** Mốc mới lấy "Cần nghiệm thu" theo hạng mục. */
export function emptyMilestone(item: Pick<ItemForm, 'requires_acceptance'>): MilestoneForm {
  return { milestone_name: '', amount: null, percent: null, due_date: '', requires_acceptance: item.requires_acceptance }
}

export function emptyForm(): ContractForm {
  return {
    contract_no: '',
    customer: '',
    contract_type: '',
    contract_title: '',
    responsible_user: '',
    signed_date: '',
    start_date: '',
    end_date: '',
    contract_file: '',
    notes: '',
    items: [emptyItem()],
  }
}

export function hasRecurring(form: Pick<ContractForm, 'items'>): boolean {
  return form.items.some((i) => i.billing_type === 'Định kỳ')
}

function endDateError(form: Pick<ContractForm, 'items' | 'end_date' | 'start_date'>): string | null {
  if (!form.end_date) return hasRecurring(form) ? MSG_END_REQUIRED : null
  if (form.start_date && form.end_date < form.start_date) return MSG_END_BEFORE_START
  return null
}

export const FORM_RULES: Rules<ContractForm> = {
  contract_no: { label: 'Số hợp đồng', required: true, maxLength: 140 },
  customer: { label: 'Khách hàng', required: true },
  start_date: { label: 'Ngày bắt đầu hiệu lực', required: true },
  // Ngày kết thúc trống mà có hạng mục Định kỳ: xem validateExtra (checkField bỏ qua ô trống).
  end_date: { label: 'Ngày kết thúc', validate: (_v, form) => endDateError(form) },
  contract_title: { label: 'Tên hợp đồng', maxLength: 140 },
  notes: { label: 'Ghi chú', maxLength: 1000 },
}

/** Lỗi mà FORM_RULES không bắt được: ngày kết thúc bắt buộc theo hạng mục, và lỗi từng hạng mục. */
export function validateExtra(form: ContractForm): Record<string, string> {
  const errors: Record<string, string> = {}
  const end = endDateError(form)
  if (end) errors.end_date = end
  return { ...errors, ...validateItems(form) }
}

const round2 = (n: number) => Math.round(n * 100) / 100
const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')

/** Tổng mốc, mục tiêu (giá trị hạng mục hoặc 100%) và độ lệch của một hạng mục Nhiều đợt. */
export function milestoneSummary(
  item: Pick<ItemForm, 'milestone_input' | 'item_value'>,
  milestones: MilestoneForm[],
): { total: number; target: number; diff: number } {
  const byPercent = item.milestone_input === 'Phần trăm'
  const total = round2(milestones.reduce((acc, m) => acc + Number((byPercent ? m.percent : m.amount) ?? 0), 0))
  const target = byPercent ? 100 : Number(item.item_value ?? 0)
  return { total, target, diff: round2(total - target) }
}

/** Lỗi theo khóa `items.<i>.<field>` và `items.<i>.milestones.<j>.<field>`; `items.<i>.milestones` là lỗi chung của danh sách mốc. */
export function validateItems(form: Pick<ContractForm, 'items' | 'end_date'>): Record<string, string> {
  const errors: Record<string, string> = {}
  form.items.forEach((item, i) => {
    const n = i + 1
    const key = (f: string) => `items.${i}.${f}`
    const need = (field: string, value: unknown, label: string): boolean => {
      if (isBlank(value)) {
        errors[key(field)] = fmt(MSG_ITEM_REQUIRED, n, label)
        return false
      }
      return true
    }
    const positive = (field: string, value: unknown, label: string) => {
      if (need(field, value, label) && Number(value) <= 0) errors[key(field)] = fmt(MSG_ITEM_POSITIVE, n, label)
    }

    const nameErr = checkField({ label: 'Tên hạng mục', required: true, maxLength: 140 }, item.item_name, item)
    if (nameErr) errors[key('item_name')] = nameErr.startsWith('Vui lòng') ? fmt(MSG_ITEM_REQUIRED, n, 'tên hạng mục') : nameErr
    need('vat_rate', item.vat_rate, 'thuế suất')

    if (item.billing_type === 'Một lần') {
      positive('amount', item.amount, 'số tiền trước thuế')
      need('due_date', item.due_date, 'ngày đến hạn')
    } else if (item.billing_type === 'Nhiều đợt') {
      positive('item_value', item.item_value, 'giá trị hạng mục trước thuế')
      validateMilestones(item, i, n, errors)
    } else if (item.billing_type === 'Định kỳ') {
      positive('unit_price', item.unit_price, 'đơn giá mỗi kỳ trước thuế')
      need('period', item.period, 'chu kỳ')
      if (item.period === 'Ngày' && need('period_days', item.period_days, 'số ngày mỗi kỳ')) {
        const d = Number(item.period_days)
        if (!Number.isInteger(d) || d < 1) errors[key('period_days')] = fmt(MSG_ITEM_POSITIVE, n, 'số ngày mỗi kỳ')
      }
      need('period_start', item.period_start, 'ngày bắt đầu kỳ đầu')
      const periodEnd = item.period_end || form.end_date
      if (item.period_start && periodEnd && periodEnd < item.period_start) {
        errors[key('period_end')] = fmt(MSG_ITEM_PERIOD_END, n)
      }
      const days = item.credit_days
      if (days !== null && days !== undefined && (!Number.isInteger(days) || days < 0)) {
        errors[key('credit_days')] = fmt(MSG_ITEM_CREDIT_DAYS, n)
      }
    }
  })
  return errors
}

function validateMilestones(item: ItemForm, i: number, n: number, errors: Record<string, string>) {
  const listKey = `items.${i}.milestones`
  if (!item.milestones.length) {
    errors[listKey] = fmt(MSG_ITEM_NO_MILESTONE, n)
    return
  }
  const byPercent = item.milestone_input === 'Phần trăm'
  const valueField = byPercent ? 'percent' : 'amount'
  const valueLabel = byPercent ? 'phần trăm' : 'số tiền'
  let rowsOk = true
  item.milestones.forEach((m, j) => {
    const k = (f: string) => `${listKey}.${j}.${f}`
    const need = (field: string, value: unknown, label: string) => {
      if (isBlank(value)) {
        errors[k(field)] = fmt(MSG_MILESTONE_REQUIRED, n, j + 1, label)
        rowsOk = false
        return false
      }
      return true
    }
    need('milestone_name', m.milestone_name, 'tên mốc')
    need('due_date', m.due_date, 'ngày đến hạn')
    const value = byPercent ? m.percent : m.amount
    if (need(valueField, value, valueLabel) && Number(value) <= 0) {
      errors[k(valueField)] = fmt(MSG_MILESTONE_POSITIVE, n, j + 1, valueLabel)
      rowsOk = false
    }
  })
  if (!rowsOk || Number(item.item_value ?? 0) <= 0) return
  const { total, target, diff } = milestoneSummary(item, item.milestones)
  if (Math.abs(diff) <= 0.01) return
  errors[listKey] = byPercent
    ? fmt(MSG_PERCENT_MISMATCH, item.item_name, formatNumber(total), formatNumber(diff))
    : fmt(MSG_AMOUNT_MISMATCH, item.item_name, formatCurrency(total), formatCurrency(target), formatCurrency(diff))
}

// ---- Hành vi khi nhập ----

/** Đổi kiểu thu: "Cần nghiệm thu" tự đặt lại (sửa tay được sau đó), điền ngày kết thúc kỳ, bỏ mốc nếu rời Nhiều đợt. */
export function onBillingTypeChange(item: ItemForm, form: Pick<ContractForm, 'end_date'>): void {
  item.requires_acceptance = item.billing_type !== 'Định kỳ'
  if (item.billing_type === 'Định kỳ' && !item.period_end && form.end_date) item.period_end = form.end_date
  if (item.billing_type !== 'Nhiều đợt') item.milestones = []
}

/** Đổi ngày kết thúc hợp đồng: điền vào ngày kết thúc kỳ còn trống của các hạng mục Định kỳ. */
export function applyContractEndDate(form: Pick<ContractForm, 'end_date' | 'items'>): void {
  if (!form.end_date) return
  for (const item of form.items) {
    if (item.billing_type === 'Định kỳ' && !item.period_end) item.period_end = form.end_date
  }
}

// ---- Chuyển dữ liệu ----

export interface ItemPayload {
  item_key: string
  item_name: string
  vat_rate: string
  billing_type: BillingType
  requires_acceptance: 0 | 1
  amount?: number | null
  due_date?: string | null
  item_value?: number | null
  milestone_input?: MilestoneInput
  unit_price?: number | null
  period?: string | null
  period_days?: number | null
  period_start?: string | null
  period_end?: string | null
  bill_timing?: string
  credit_days?: number
}

export interface MilestonePayload {
  item_key: string
  milestone_name: string
  amount?: number | null
  percent?: number | null
  due_date: string | null
  requires_acceptance: 0 | 1
}

export interface ContractPayload {
  contract_no: string
  customer: string
  contract_type: string | null
  contract_title: string | null
  responsible_user: string | null
  signed_date: string | null
  start_date: string | null
  end_date: string | null
  contract_file: string | null
  notes: string | null
  items: ItemPayload[]
  milestones: MilestonePayload[]
}

const nul = (s: string) => (s && s.trim() ? s.trim() : null)

function itemPayload(item: ItemForm): ItemPayload {
  const base: ItemPayload = {
    item_key: item.item_key,
    item_name: item.item_name.trim(),
    vat_rate: item.vat_rate,
    billing_type: item.billing_type,
    requires_acceptance: item.requires_acceptance ? 1 : 0,
  }
  if (item.billing_type === 'Một lần') return { ...base, amount: item.amount, due_date: nul(item.due_date) }
  if (item.billing_type === 'Nhiều đợt') {
    return { ...base, item_value: item.item_value, milestone_input: item.milestone_input }
  }
  return {
    ...base,
    unit_price: item.unit_price,
    period: nul(item.period),
    period_days: item.period === 'Ngày' ? item.period_days : null,
    period_start: nul(item.period_start),
    period_end: nul(item.period_end),
    bill_timing: item.bill_timing,
    credit_days: item.credit_days ?? 0,
  }
}

/** Dữ liệu gửi server: chuỗi rỗng thành null; chỉ gửi trường của đúng kiểu thu; mốc là mảng phẳng; không gửi trạng thái và số tổng. */
export function toPayload(form: ContractForm): ContractPayload {
  const milestones: MilestonePayload[] = []
  for (const item of form.items) {
    if (item.billing_type !== 'Nhiều đợt') continue
    for (const m of item.milestones) {
      const byPercent = item.milestone_input === 'Phần trăm'
      milestones.push({
        item_key: item.item_key,
        milestone_name: m.milestone_name.trim(),
        ...(byPercent ? { percent: m.percent } : { amount: m.amount }),
        due_date: nul(m.due_date),
        requires_acceptance: m.requires_acceptance ? 1 : 0,
      })
    }
  }
  return {
    contract_no: form.contract_no.trim(),
    customer: form.customer,
    contract_type: nul(form.contract_type),
    contract_title: nul(form.contract_title),
    responsible_user: nul(form.responsible_user),
    signed_date: nul(form.signed_date),
    start_date: nul(form.start_date),
    end_date: nul(form.end_date),
    contract_file: nul(form.contract_file),
    notes: nul(form.notes),
    items: form.items.map(itemPayload),
    milestones,
  }
}

const numOrNull = (v: number | null | undefined) => (v ? Number(v) : null)

function itemFromDoc(i: ContractItem, milestones: ContractMilestone[]): ItemForm {
  const base = emptyItem()
  const key = i.item_key || base.item_key
  const input = (i.milestone_input as MilestoneInput) || 'Số tiền'
  return {
    item_key: key,
    item_name: i.item_name ?? '',
    vat_rate: i.vat_rate ?? '',
    billing_type: (i.billing_type as BillingType) || 'Một lần',
    requires_acceptance: !!i.requires_acceptance,
    amount: numOrNull(i.amount),
    due_date: i.due_date ?? '',
    item_value: numOrNull(i.item_value),
    milestone_input: input,
    milestones:
      i.billing_type === 'Nhiều đợt'
        ? milestones
            .filter((m) => m.item_key === key)
            .map((m) => ({
              milestone_name: m.milestone_name ?? '',
              amount: numOrNull(m.amount),
              percent: numOrNull(m.percent),
              due_date: m.due_date ?? '',
              requires_acceptance: !!m.requires_acceptance,
            }))
        : [],
    unit_price: numOrNull(i.unit_price),
    period: i.period ?? '',
    period_days: numOrNull(i.period_days),
    period_start: i.period_start ?? '',
    period_end: i.period_end ?? '',
    bill_timing: i.bill_timing || 'Đầu kỳ',
    credit_days: i.credit_days ?? 0,
  }
}

/** Chiều ngược lại của toPayload: gom mốc về đúng hạng mục theo item_key; mốc mồ côi bị bỏ. */
export function fromDoc(doc: Contract): ContractForm {
  const milestones = doc.milestones ?? []
  const items = (doc.items ?? []).map((i) => itemFromDoc(i, milestones))
  return {
    contract_no: doc.contract_no ?? '',
    customer: doc.customer ?? '',
    contract_type: doc.contract_type ?? '',
    contract_title: doc.contract_title ?? '',
    responsible_user: doc.responsible_user ?? '',
    signed_date: doc.signed_date ?? '',
    start_date: doc.start_date ?? '',
    end_date: doc.end_date ?? '',
    contract_file: doc.contract_file ?? '',
    notes: doc.notes ?? '',
    items: items.length ? items : [emptyItem()],
  }
}

// ---- Kỳ định kỳ (bản TypeScript của recurring_periods ở contract.py) ----

export interface PeriodRange {
  from: string
  to: string
  /** Tỷ lệ so với kỳ đầy đủ (kỳ cuối lẻ < 1). */
  ratio: number
}

const PERIOD_MONTHS: Record<string, number> = { 'Tháng': 1, 'Quý': 3, '6 tháng': 6, 'Năm': 12 }

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const DAY_MS = 86_400_000
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS)
const diffDays = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY_MS)
/** Cộng tháng, kẹp ngày cuối tháng như add_months của Frappe (31/01 + 1 tháng = 28/02). */
function addMonths(d: Date, n: number): Date {
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + n
  const y = Math.floor(total / 12)
  const m = total % 12
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last)))
}

/** Danh sách kỳ thu từ ngày bắt đầu đến ngày kết thúc; kỳ cuối vượt thì cắt và tính tỷ lệ theo số ngày thực tế. */
export function recurringPeriods(
  period: string,
  start: string,
  end: string,
  periodDays?: number | null,
): PeriodRange[] {
  if (!start || !end) return []
  const s = parseIso(start)
  const e = parseIso(end)
  const result: PeriodRange[] = []
  if (period === 'Ngày') {
    const n = Math.floor(Number(periodDays ?? 0))
    if (!(n >= 1)) return []
    for (let k = 0; ; k++) {
      const from = addDays(s, k * n)
      if (from > e) break
      const to = addDays(from, n - 1) < e ? addDays(from, n - 1) : e
      result.push({ from: toIso(from), to: toIso(to), ratio: (diffDays(to, from) + 1) / n })
    }
    return result
  }
  const months = PERIOD_MONTHS[period]
  if (!months) return []
  for (let k = 0; ; k++) {
    const from = addMonths(s, k * months)
    if (from > e) break
    const fullTo = addDays(addMonths(s, (k + 1) * months), -1)
    const to = fullTo < e ? fullTo : e
    const ratio = to.getTime() === fullTo.getTime() ? 1 : (diffDays(to, from) + 1) / (diffDays(fullTo, from) + 1)
    result.push({ from: toIso(from), to: toIso(to), ratio })
  }
  return result
}

// ---- Tab Lịch thu (đợt thu, chỉ đọc) ----

export const SCHEDULE_DOCTYPE = 'Payment Schedule'
export const MSG_NO_SCHEDULE = 'Chưa có lịch thu. Bấm Kích hoạt để sinh các đợt thu.'

export interface ScheduleRow {
  name: string
  item_name?: string | null
  schedule_name?: string | null
  period_from?: string | null
  period_to?: string | null
  due_date?: string | null
  amount_before_tax?: number | null
  tax_amount?: number | null
  total_amount?: number | null
  requires_acceptance?: 0 | 1 | boolean | null
  acceptance_status?: string | null
  request_status?: string | null
  invoice_status?: string | null
  invoice_no?: string | null
  payment_status?: string | null
  paid_amount?: number | null
  is_overdue?: 0 | 1 | boolean | null
}

export const SCHEDULE_FIELDS: (keyof ScheduleRow)[] = [
  'name',
  'item_name',
  'schedule_name',
  'period_from',
  'period_to',
  'due_date',
  'amount_before_tax',
  'tax_amount',
  'total_amount',
  'requires_acceptance',
  'acceptance_status',
  'request_status',
  'invoice_status',
  'invoice_no',
  'payment_status',
  'paid_amount',
  'is_overdue',
]

const NO_ACCEPTANCE: StatusDef = { label: 'Không cần', icon: 'lucide-minus-circle', tone: 'gray' }

export const ACCEPTANCE_STATUS: Record<string, StatusDef> = {
  'Không cần': NO_ACCEPTANCE,
  'Chưa': { label: 'Chưa nghiệm thu', icon: 'lucide-hourglass', tone: 'amber' },
  'Đã ký': { label: 'Đã ký', icon: 'lucide-badge-check', tone: 'green' },
}
export const REQUEST_STATUS: Record<string, StatusDef> = {
  'Chưa lập': { label: 'Chưa lập', icon: 'lucide-file-minus', tone: 'gray' },
  'Đã lập': { label: 'Đã lập', icon: 'lucide-file-check', tone: 'blue' },
}
export const INVOICE_STATUS: Record<string, StatusDef> = {
  'Chưa xuất': { label: 'Chưa xuất', icon: 'lucide-receipt-text', tone: 'gray' },
  'Đã xuất': { label: 'Đã xuất', icon: 'lucide-receipt-text', tone: 'blue' },
}
export const PAYMENT_STATUS: Record<string, StatusDef> = {
  'Chưa thu': { label: 'Chưa thu', icon: 'lucide-circle-dashed', tone: 'gray' },
  'Thu một phần': { label: 'Thu một phần', icon: 'lucide-circle-dot', tone: 'amber' },
  'Đã thu': { label: 'Đã thu', icon: 'lucide-circle-check', tone: 'green' },
}

/** Nghiệm thu: "Không cần" khi đợt không cần nghiệm thu, bất kể giá trị đã lưu. */
export function acceptanceStatusOf(row: ScheduleRow): StatusDef {
  if (!row.requires_acceptance) return NO_ACCEPTANCE
  return ACCEPTANCE_STATUS[row.acceptance_status || 'Chưa'] ?? ACCEPTANCE_STATUS['Chưa']
}
export function requestStatusOf(row: ScheduleRow): StatusDef {
  return REQUEST_STATUS[row.request_status || 'Chưa lập'] ?? REQUEST_STATUS['Chưa lập']
}
export function invoiceStatusOf(row: ScheduleRow): StatusDef {
  const def = INVOICE_STATUS[row.invoice_status || 'Chưa xuất'] ?? INVOICE_STATUS['Chưa xuất']
  return row.invoice_status === 'Đã xuất' && row.invoice_no ? { ...def, label: `Đã xuất ${row.invoice_no}` } : def
}
/** Thanh toán: nhãn trạng thái kèm số đã thu khi có thu tiền, ví dụ "Thu một phần 7.000.000". */
export function paymentStatusOf(row: ScheduleRow): StatusDef {
  const def = PAYMENT_STATUS[row.payment_status || 'Chưa thu'] ?? PAYMENT_STATUS['Chưa thu']
  const paid = Number(row.paid_amount ?? 0)
  return paid > 0 ? { ...def, label: `${def.label} ${formatCurrency(paid)}` } : def
}

export const OVERDUE_STATUS: Record<'yes' | 'no', StatusDef> = {
  yes: { label: 'Quá hạn', icon: 'lucide-alarm-clock', tone: 'red' },
  no: { label: 'Không', icon: 'lucide-minus', tone: 'gray' },
}
export function overdueStatusOf(row: ScheduleRow): StatusDef {
  return row.is_overdue ? OVERDUE_STATUS.yes : OVERDUE_STATUS.no
}

/** "dd/mm/yyyy - dd/mm/yyyy"; rỗng nếu đợt không định kỳ. */
export function periodText(row: Pick<ScheduleRow, 'period_from' | 'period_to'>): string {
  if (!row.period_from || !row.period_to) return ''
  return `${formatDate(row.period_from)} - ${formatDate(row.period_to)}`
}

export const SCHEDULE_COLUMNS: Column<ScheduleRow>[] = [
  { key: '_index', label: 'STT', width: 56, type: 'index' },
  { key: 'item_name', label: 'Hạng mục', width: 180 },
  { key: 'schedule_name', label: 'Tên đợt', width: 220 },
  { key: '_period', label: 'Kỳ', width: 220, format: periodText },
  { key: 'due_date', label: 'Ngày đến hạn', width: 120, type: 'date' },
  { key: 'amount_before_tax', label: 'Trước thuế (VND)', width: 150, type: 'currency' },
  { key: 'tax_amount', label: 'Tiền thuế (VND)', width: 140, type: 'currency' },
  { key: 'total_amount', label: 'Tổng tiền (VND)', width: 150, type: 'currency' },
  { key: 'acceptance_status', label: 'Nghiệm thu', width: 150, type: 'status', status: acceptanceStatusOf },
  { key: 'request_status', label: 'Đề nghị thanh toán', width: 160, type: 'status', status: requestStatusOf },
  { key: 'invoice_status', label: 'Hóa đơn', width: 160, type: 'status', status: invoiceStatusOf },
  { key: 'payment_status', label: 'Thanh toán', width: 230, type: 'status', status: paymentStatusOf },
  { key: 'is_overdue', label: 'Quá hạn', width: 120, type: 'status', status: overdueStatusOf },
]

/** Dòng Tổng của bảng Lịch thu. */
export function scheduleTotals(rows: Pick<ScheduleRow, 'amount_before_tax' | 'tax_amount' | 'total_amount'>[]) {
  const sum = (pick: (r: (typeof rows)[number]) => number | null | undefined) =>
    rows.reduce((acc, r) => acc + Number(pick(r) ?? 0), 0)
  return {
    before: sum((r) => r.amount_before_tax),
    tax: sum((r) => r.tax_amount),
    total: sum((r) => r.total_amount),
  }
}

/** Hợp đồng Nháp chưa có đợt: hiện hướng dẫn thay cho bảng. */
export const showScheduleTable = (status: string | undefined | null) => status !== 'Nháp'
