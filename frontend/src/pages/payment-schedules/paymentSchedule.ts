// Logic (không giao diện) của màn Lịch thu tiền toàn công ty: cột, lọc nhanh, bộ lọc panel, thẻ số liệu, chọn nhiều đợt.
// Đợt thu do hệ thống sinh nên màn này chỉ đọc; không có form.
import {
  acceptanceStatusOf,
  invoiceStatusOf,
  overdueStatusOf,
  paymentStatusOf,
  requestStatusOf,
  type ScheduleRow,
} from '@/pages/contracts/contract'
import { formatCurrency, type Column, type StatCard, type StatusDef, type TreeNode } from '@/standard'

export const DOCTYPE = 'Payment Schedule'
export const ORDER_BY = 'due_date asc, name asc'
export const LIMIT = 5000

export const MSG_EMPTY = 'Chưa có đợt thu nào. Kích hoạt hợp đồng để sinh lịch thu.'
export const MSG_SAME_CUSTOMER = 'Chỉ chọn được các đợt của cùng một khách hàng.'
export const MSG_NO_SELECTION = 'Chọn ít nhất một đợt thu.'
export const MSG_INVOICED = 'Có đợt đã xuất hóa đơn: {0}.'
export const MSG_PAID = 'Có đợt đã thu đủ: {0}.'
export const MSG_NOT_REQUIRED_PICK = 'Đợt không cần nghiệm thu: {0}.'
export const MSG_IN_OTHER_MINUTES_PICK = 'Đợt đã nằm trong biên bản nghiệm thu khác: {0}.'
export const MSG_LIMIT = 'Có từ 5000 đợt thu, danh sách có thể chưa đủ. Hãy báo người giao việc.'

export function fmt(template: string, ...args: (string | number)[]): string {
  return template.replace(/\{(\d+)\}/g, (_m, i: string) => String(args[Number(i)] ?? ''))
}

export interface ScheduleListRow extends ScheduleRow {
  contract: string
  customer: string
  customer_name?: string | null
  vat_rate?: string | null
  responsible_user?: string | null
}

export const LIST_FIELDS: (keyof ScheduleListRow)[] = [
  'name',
  'contract',
  'customer',
  'customer_name',
  'responsible_user',
  'item_name',
  'schedule_name',
  'period_from',
  'period_to',
  'due_date',
  'amount_before_tax',
  'vat_rate',
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

/** Còn nợ của đợt = tổng tiền − đã thu (tính ở giao diện, không lưu). */
export function outstandingOf(row: Pick<ScheduleRow, 'total_amount' | 'paid_amount'>): number {
  return Number(row.total_amount ?? 0) - Number(row.paid_amount ?? 0)
}

/** Tên hiển thị của người phụ trách; chưa có trong danh sách thì hiện chính mã (email). */
export function makeColumns(userName: (user: string) => string): Column<ScheduleListRow>[] {
  const money = (key: string, label: string, extra: Partial<Column<ScheduleListRow>> = {}): Column<ScheduleListRow> => ({
    key,
    label,
    width: 160,
    type: 'currency',
    sum: true,
    ...extra,
  })
  return [
    { key: '_pick', label: 'Chọn', width: 80, pin: 'left', sortable: false, filter: 'none', required: true },
    { key: '_index', label: 'STT', width: 56, type: 'index', pin: 'left' },
    { key: 'contract', label: 'Số hợp đồng', width: 150, pin: 'left', required: true },
    { key: 'customer_name', label: 'Khách hàng', width: 240 },
    { key: 'schedule_name', label: 'Tên đợt', width: 220 },
    { key: 'item_name', label: 'Hạng mục', width: 180 },
    { key: 'due_date', label: 'Ngày đến hạn', width: 120, type: 'date' },
    money('amount_before_tax', 'Trước thuế (VND)'),
    money('tax_amount', 'Tiền thuế (VND)', { width: 150 }),
    money('total_amount', 'Tổng tiền (VND)'),
    money('paid_amount', 'Đã thu (VND)'),
    money('_outstanding', 'Còn nợ (VND)', { value: outstandingOf, format: (r) => formatCurrency(outstandingOf(r)) }),
    { key: 'acceptance_status', label: 'Nghiệm thu', width: 150, type: 'status', status: acceptanceStatusOf },
    { key: 'request_status', label: 'Đề nghị thanh toán', width: 160, type: 'status', status: requestStatusOf },
    { key: 'invoice_status', label: 'Hóa đơn', width: 170, type: 'status', status: invoiceStatusOf },
    { key: 'payment_status', label: 'Thanh toán', width: 230, type: 'status', status: paymentStatusOf },
    { key: 'is_overdue', label: 'Quá hạn', width: 120, type: 'status', status: overdueStatusOf },
    { key: 'period_from', label: 'Kỳ từ', width: 120, type: 'date', hidden: true },
    { key: 'period_to', label: 'Kỳ đến', width: 120, type: 'date', hidden: true },
    { key: 'vat_rate', label: 'Thuế suất', width: 140, hidden: true },
    {
      key: 'responsible_user',
      label: 'Người phụ trách',
      width: 180,
      hidden: true,
      format: (r) => (r.responsible_user ? userName(r.responsible_user) : ''),
    },
  ]
}

export const COLUMNS = makeColumns((u) => u)

// ---- Lọc nhanh ----

export type QuickKey = 'due_this_month' | 'overdue' | 'not_accepted' | 'no_request' | 'not_invoiced' | 'invoiced_unpaid'

export const QUICK_FILTERS: { key: QuickKey; label: string; status: StatusDef }[] = [
  { key: 'due_this_month', label: 'Đến hạn tháng này', status: { label: 'Đến hạn tháng này', icon: 'lucide-calendar-clock', tone: 'amber' } },
  { key: 'overdue', label: 'Quá hạn', status: { label: 'Quá hạn', icon: 'lucide-alarm-clock', tone: 'red' } },
  { key: 'not_accepted', label: 'Chưa nghiệm thu', status: { label: 'Chưa nghiệm thu', icon: 'lucide-hourglass', tone: 'amber' } },
  { key: 'no_request', label: 'Chưa lập đề nghị', status: { label: 'Chưa lập đề nghị', icon: 'lucide-file-minus', tone: 'gray' } },
  { key: 'not_invoiced', label: 'Chưa xuất hóa đơn', status: { label: 'Chưa xuất hóa đơn', icon: 'lucide-receipt-text', tone: 'gray' } },
  { key: 'invoiced_unpaid', label: 'Đã xuất hóa đơn chưa thu', status: { label: 'Đã xuất hóa đơn chưa thu', icon: 'lucide-receipt-text', tone: 'blue' } },
]

const dayOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const todayStr = (now: Date = new Date()) => dayOf(now)

export function matchQuick(row: ScheduleListRow, key: QuickKey, today: string): boolean {
  switch (key) {
    case 'due_this_month':
      return !!row.due_date && row.due_date.slice(0, 7) === today.slice(0, 7) && row.payment_status !== 'Đã thu'
    case 'overdue':
      return !!row.is_overdue
    case 'not_accepted':
      return !!row.requires_acceptance && row.acceptance_status === 'Chưa'
    case 'no_request':
      return (row.request_status || 'Chưa lập') === 'Chưa lập'
    case 'not_invoiced':
      return (row.invoice_status || 'Chưa xuất') === 'Chưa xuất'
    case 'invoiced_unpaid':
      return row.invoice_status === 'Đã xuất' && row.payment_status !== 'Đã thu'
  }
}

export function applyQuick<T extends ScheduleListRow>(rows: T[], key: string | null, today: string = todayStr()): T[] {
  if (!key) return rows
  return rows.filter((r) => matchQuick(r, key as QuickKey, today))
}

/** Hàng chip lọc nhanh: giá trị là số đợt; bấm để lọc, bấm lại để bỏ (dùng StatCards). */
export function quickCards(rows: ScheduleListRow[], today: string = todayStr()): StatCard[] {
  return QUICK_FILTERS.map((q) => ({
    key: q.key,
    label: q.label,
    value: rows.filter((r) => matchQuick(r, q.key, today)).length,
    status: q.status,
  }))
}

// ---- Bộ lọc panel ----

export interface PanelFilters {
  /** Khách hàng được tích ở cây nhóm. */
  groups: string[]
  dueFrom: string
  dueTo: string
  customer: string
  responsibleUser: string
  contract: string
}

export function emptyFilters(): PanelFilters {
  return { groups: [], dueFrom: '', dueTo: '', customer: '', responsibleUser: '', contract: '' }
}

/** Cây chọn đủ khách hàng, hoặc chưa có dữ liệu cây thì không lọc theo cây. */
function treeFilterOff(f: PanelFilters, allCustomers: string[]): boolean {
  return allCustomers.length === 0 || allCustomers.every((c) => f.groups.includes(c))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFrappeFilters(f: PanelFilters, allCustomers: string[]): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: Record<string, any> = {}
  if (!treeFilterOff(f, allCustomers)) {
    if (f.groups.length === 0) filters.name = ['in', []]
    else filters.customer = ['in', f.groups]
  }
  if (f.dueFrom && f.dueTo) filters.due_date = ['between', [f.dueFrom, f.dueTo]]
  else if (f.dueFrom) filters.due_date = ['>=', f.dueFrom]
  else if (f.dueTo) filters.due_date = ['<=', f.dueTo]
  // Ô Khách hàng kết hợp (AND) với cây: khách hàng ngoài các nhóm đang tích thì không có đợt nào khớp.
  if (f.customer) {
    if (!treeFilterOff(f, allCustomers) && !f.groups.includes(f.customer)) {
      delete filters.customer
      filters.name = ['in', []]
    } else filters.customer = f.customer
  }
  if (f.responsibleUser) filters.responsible_user = f.responsibleUser
  if (f.contract) filters.contract = f.contract
  return filters
}

export function filtersActive(f: PanelFilters, allCustomers: string[]): boolean {
  return (
    !treeFilterOff(f, allCustomers) ||
    !!(f.dueFrom || f.dueTo || f.customer || f.responsibleUser || f.contract)
  )
}

/** Cây "Truy vấn nhóm": Tất cả đợt thu → từng khách hàng, kèm số đợt. */
export function groupTree(rows: Pick<ScheduleListRow, 'customer' | 'customer_name'>[]): TreeNode[] {
  const byCustomer = new Map<string, { label: string; count: number }>()
  for (const r of rows) {
    const g = byCustomer.get(r.customer) ?? { label: r.customer_name || r.customer, count: 0 }
    g.count += 1
    byCustomer.set(r.customer, g)
  }
  const children = [...byCustomer.entries()]
    .map(([key, g]) => ({ key, label: g.label, icon: 'lucide-building-2', count: g.count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'))
  return [{ key: 'all', label: 'Tất cả đợt thu', icon: 'lucide-layers', count: rows.length, children }]
}

// ---- Kỳ và thẻ số liệu ----

export interface PeriodRange {
  from: string | null
  to: string | null
}

/** Kỳ của thẻ Phải thu: khoảng ngày đến hạn đang lọc; chưa nhập thì là tháng hiện tại. */
export function periodRange(f: Pick<PanelFilters, 'dueFrom' | 'dueTo'>, today: string = todayStr()): PeriodRange {
  if (!f.dueFrom && !f.dueTo) {
    const [y, m] = today.split('-').map(Number)
    const last = new Date(y, m, 0).getDate()
    const mm = String(m).padStart(2, '0')
    return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` }
  }
  return { from: f.dueFrom || null, to: f.dueTo || null }
}

export function inRange(date: string | null | undefined, range: PeriodRange): boolean {
  if (!date) return false
  if (range.from && date < range.from) return false
  if (range.to && date > range.to) return false
  return true
}

const sumOf = (rows: ScheduleListRow[], pick: (r: ScheduleListRow) => number) => rows.reduce((a, r) => a + pick(r), 0)

/** 4 thẻ số liệu, tính trên dữ liệu đã lọc ở panel (không phụ thuộc lọc nhanh). */
export function statCards(rows: ScheduleListRow[], range: PeriodRange): StatCard[] {
  const inPeriod = rows.filter((r) => inRange(r.due_date, range))
  const overdue = rows.filter((r) => !!r.is_overdue)
  const notInvoiced = rows.filter((r) => (r.invoice_status || 'Chưa xuất') === 'Chưa xuất')
  return [
    { key: 'receivable', label: 'Phải thu trong kỳ (VND)', value: formatCurrency(sumOf(inPeriod, outstandingOf)) },
    { key: 'paid', label: 'Đã thu (VND)', value: formatCurrency(sumOf(inPeriod, (r) => Number(r.paid_amount ?? 0))) },
    {
      key: 'overdue',
      label: `Quá hạn (VND) · ${overdue.length} đợt`,
      value: formatCurrency(sumOf(overdue, outstandingOf)),
      status: QUICK_FILTERS[1].status,
    },
    {
      key: 'not_invoiced',
      label: `Chưa xuất hóa đơn (VND) · ${notInvoiced.length} đợt`,
      value: formatCurrency(sumOf(notInvoiced, (r) => Number(r.total_amount ?? 0))),
    },
  ]
}

// ---- Chọn nhiều đợt ----

/** Chọn được khi chưa chọn đợt nào, hoặc cùng khách hàng với các đợt đã chọn. */
export function canPick(row: Pick<ScheduleListRow, 'customer'>, pickedRows: Pick<ScheduleListRow, 'customer'>[]): boolean {
  return pickedRows.length === 0 || pickedRows[0].customer === row.customer
}

export function togglePick(picked: string[], row: ScheduleListRow, pickedRows: ScheduleListRow[]): string[] {
  if (picked.includes(row.name)) return picked.filter((n) => n !== row.name)
  return canPick(row, pickedRows) ? [...picked, row.name] : picked
}

export interface ActionState {
  enabled: boolean
  reason: string
}

const names = (rows: ScheduleListRow[]) => rows.map((r) => r.schedule_name || r.name).join(', ')

export function actionState(pickedRows: ScheduleListRow[]): {
  invoice: ActionState
  receipt: ActionState
  request: ActionState
  acceptance: ActionState
} {
  if (!pickedRows.length) {
    const off = { enabled: false, reason: MSG_NO_SELECTION }
    return { invoice: off, receipt: { ...off }, request: { ...off }, acceptance: { ...off } }
  }
  // Biên bản nghiệm thu: dừng khi có đợt không cần nghiệm thu hoặc đã nằm trong biên bản (Đã ký), không bỏ bớt đợt.
  const notRequired = pickedRows.filter((r) => !r.requires_acceptance)
  const signed = pickedRows.filter((r) => r.requires_acceptance && r.acceptance_status === 'Đã ký')
  const acceptance = notRequired.length
    ? { enabled: false, reason: fmt(MSG_NOT_REQUIRED_PICK, names(notRequired)) }
    : signed.length
      ? { enabled: false, reason: fmt(MSG_IN_OTHER_MINUTES_PICK, names(signed)) }
      : { enabled: true, reason: '' }
  const invoiced = pickedRows.filter((r) => (r.invoice_status || 'Chưa xuất') !== 'Chưa xuất')
  const paid = pickedRows.filter((r) => r.payment_status === 'Đã thu' || outstandingOf(r) <= 0)
  const paidState = paid.length ? { enabled: false, reason: fmt(MSG_PAID, names(paid)) } : { enabled: true, reason: '' }
  return {
    invoice: invoiced.length
      ? { enabled: false, reason: fmt(MSG_INVOICED, names(invoiced)) }
      : { enabled: true, reason: '' },
    receipt: paidState,
    // Đợt đã "Đã lập" vẫn chọn được: hệ thống báo trùng khi lưu.
    request: { ...paidState },
    acceptance,
  }
}

/** Đợt đang chọn nằm trong biên bản Nháp khác (từ get_acceptable_schedules): danh sách "tên đợt (mã biên bản)". */
export function minutesConflicts(
  pickedNames: string[],
  acceptable: { name: string; schedule_name?: string | null; acceptance_minutes?: string | null }[],
): string[] {
  return acceptable
    .filter((s) => pickedNames.includes(s.name) && s.acceptance_minutes)
    .map((s) => `${s.schedule_name || s.name} (${s.acceptance_minutes})`)
}

export const toScheduleQuery = (list: string[]) => list.join(',')

export function parseScheduleQuery(q: unknown): string[] {
  const text = Array.isArray(q) ? q.join(',') : typeof q === 'string' ? q : ''
  return [...new Set(text.split(',').map((s) => s.trim()).filter(Boolean))]
}
