// Logic (không giao diện) của màn Đề nghị thanh toán: trạng thái, cột bảng, nhóm, bộ lọc, quy tắc kiểm tra, tổng, chuyển dữ liệu form <-> server.
// Quy tắc và câu báo lỗi khớp với contract_tracker/doctype/payment_request/payment_request.py.
import type { PaymentRequest, PaymentRequestItem } from '@/types/doctypes'
import { checkField, formatCurrency, type Column, type Rules, type StatusDef, type TreeNode } from '@/standard'

export const DOCTYPE = 'Payment Request'
export const PRINT_FORMAT = 'Đề nghị thanh toán'

export type { PaymentRequest, PaymentRequestItem } from '@/types/doctypes'

// ---- Thông báo (chép y nguyên từ payment_request.py) ----

export const MSG_NO_ITEMS = 'Đề nghị thanh toán phải có ít nhất 1 đợt thu.'
export const MSG_DUP_ROW = 'Dòng {0}: đợt {1} bị trùng trong đề nghị.'
export const MSG_OTHER_CUSTOMER = 'Dòng {0}: đợt {1} không thuộc khách hàng của đề nghị.'
export const MSG_BAD_CONTRACT = 'Dòng {0}: hợp đồng {1} đang ở trạng thái {2}, không lập đề nghị được.'
export const MSG_FULLY_PAID = 'Dòng {0}: đợt {1} đã thu đủ, không lập đề nghị được.'
export const MSG_IN_OTHER_REQUEST = 'Dòng {0}: đợt {1} đã nằm trong đề nghị {2}.'
export const MSG_DUE_BEFORE_REQUEST = 'Hạn thanh toán không được trước ngày lập.'
export const MSG_SENT_LOCKED = 'Đề nghị đã gửi, chỉ sửa được ghi chú.'
export const MSG_STATUS_READONLY = 'Trạng thái đề nghị chỉ đổi bằng nút Đánh dấu đã gửi.'
export const MSG_DELETE_SENT = 'Chỉ xóa được đề nghị Nháp.'

export function fmt(template: string, ...args: (string | number)[]): string {
  return template.replace(/\{(\d+)\}/g, (_m, i: string) => String(args[Number(i)] ?? ''))
}

// ---- Trạng thái ----

export const STATUSES = ['Nháp', 'Đã gửi'] as const
export type RequestStatus = (typeof STATUSES)[number]

export const REQUEST_STATUS: Record<RequestStatus, StatusDef> = {
  Nháp: { label: 'Nháp', icon: 'lucide-file-pen-line', tone: 'gray' },
  'Đã gửi': { label: 'Đã gửi', icon: 'lucide-send', tone: 'green' },
}

export function statusOf(row: Pick<PaymentRequest, 'status'>): StatusDef {
  return REQUEST_STATUS[(row.status ?? 'Nháp') as RequestStatus] ?? REQUEST_STATUS['Nháp']
}

/** Đề nghị Đã gửi khóa sửa, trừ ghi chú. */
export const isLocked = (status: string | undefined | null) => status === 'Đã gửi'
export const canMarkSent = (status: string | undefined | null) => (status ?? 'Nháp') === 'Nháp'
export const canDelete = (status: string | undefined | null) => (status ?? 'Nháp') === 'Nháp'

/** Đường dẫn tải bản in PDF theo Print Format "Đề nghị thanh toán". */
export function printUrl(name: string): string {
  return (
    '/api/method/frappe.utils.print_format.download_pdf' +
    `?doctype=${encodeURIComponent(DOCTYPE)}&name=${encodeURIComponent(name)}&format=${encodeURIComponent(PRINT_FORMAT)}`
  )
}

// ---- Danh sách ----

export const COLUMNS: Column<PaymentRequest>[] = [
  { key: '_index', label: 'STT', width: 56, type: 'index', pin: 'left' },
  { key: 'name', label: 'Số đề nghị', width: 160, pin: 'left', required: true },
  { key: 'customer_name', label: 'Khách hàng', width: 240 },
  { key: 'request_date', label: 'Ngày lập', width: 120, type: 'date' },
  { key: 'due_date', label: 'Hạn thanh toán', width: 130, type: 'date' },
  { key: 'total_before_tax', label: 'Trước thuế (VND)', width: 160, type: 'currency', sum: true },
  { key: 'total_tax', label: 'Tiền thuế (VND)', width: 150, type: 'currency', sum: true },
  { key: 'grand_total', label: 'Tổng cộng (VND)', width: 160, type: 'currency', sum: true },
  {
    key: 'status',
    label: 'Trạng thái',
    width: 140,
    type: 'status',
    status: statusOf,
    filter: 'select',
    options: STATUSES.map((s) => ({ label: s, value: s })),
  },
  { key: '_actions', label: 'Thao tác', width: 110, pin: 'right', sortable: false, filter: 'none', required: true },
]

export const ITEM_COLUMNS: Column<PaymentRequestItem>[] = [
  { key: 'schedule_name', label: 'Nội dung', width: 220 },
  { key: 'contract', label: 'Hợp đồng', width: 150 },
  { key: 'due_date', label: 'Ngày đến hạn', width: 120, type: 'date' },
  { key: 'amount_before_tax', label: 'Trước thuế (VND)', width: 150, type: 'currency' },
  { key: 'tax_amount', label: 'Tiền thuế (VND)', width: 140, type: 'currency' },
  { key: 'total_amount', label: 'Tổng tiền (VND)', width: 150, type: 'currency' },
  { key: 'outstanding', label: 'Còn nợ (VND)', width: 150, type: 'currency' },
]

/** Cây "Truy vấn nhóm": Tất cả đề nghị → Nháp / Đã gửi, kèm số lượng. */
export function groupTree(rows: Pick<PaymentRequest, 'status'>[]): TreeNode[] {
  return [
    {
      key: 'all',
      label: 'Tất cả đề nghị',
      icon: 'lucide-layers',
      count: rows.length,
      children: STATUSES.map((s) => ({
        key: s,
        label: s,
        icon: REQUEST_STATUS[s].icon,
        count: rows.filter((r) => (r.status ?? 'Nháp') === s).length,
      })),
    },
  ]
}

export interface PanelFilters {
  groups: string[]
  customer: string
  dateFrom: string
  dateTo: string
  requestNo: string
}

export function emptyFilters(): PanelFilters {
  return { groups: [...STATUSES], customer: '', dateFrom: '', dateTo: '', requestNo: '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFrappeFilters(f: PanelFilters): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: Record<string, any> = {}
  // Bỏ chọn hết nhóm: trả điều kiện không khớp bản ghi nào, không để ô Số đề nghị ghi đè.
  if (f.groups.length === 0) return { name: ['in', []] }
  if (f.groups.length < STATUSES.length) filters.status = ['in', f.groups]
  if (f.customer) filters.customer = f.customer
  if (f.dateFrom && f.dateTo) filters.request_date = ['between', [f.dateFrom, f.dateTo]]
  else if (f.dateFrom) filters.request_date = ['>=', f.dateFrom]
  else if (f.dateTo) filters.request_date = ['<=', f.dateTo]
  if (f.requestNo.trim()) filters.name = ['like', `%${f.requestNo.trim()}%`]
  return filters
}

export function filtersActive(f: PanelFilters): boolean {
  const d = emptyFilters()
  return (
    f.customer !== d.customer ||
    f.dateFrom !== d.dateFrom ||
    f.dateTo !== d.dateTo ||
    f.requestNo !== d.requestNo ||
    f.groups.length !== d.groups.length
  )
}

/** Thẻ số liệu: số đề nghị Nháp, số đề nghị Đã gửi, Tổng tiền (VND). */
export function statCards(rows: Pick<PaymentRequest, 'status' | 'grand_total'>[]) {
  const count = (s: RequestStatus) => rows.filter((r) => (r.status ?? 'Nháp') === s).length
  const sum = rows.reduce((acc, r) => acc + Number(r.grand_total ?? 0), 0)
  return [
    { key: 'Nháp', label: 'Số đề nghị Nháp', value: count('Nháp'), status: REQUEST_STATUS['Nháp'] },
    { key: 'Đã gửi', label: 'Số đề nghị Đã gửi', value: count('Đã gửi'), status: REQUEST_STATUS['Đã gửi'] },
    { key: 'sum', label: 'Tổng tiền (VND)', value: formatCurrency(sum) },
  ]
}

// ---- Form ----

/** Đợt có thể chọn (kết quả của get_requestable_schedules). */
export interface RequestableSchedule {
  name: string
  schedule_name?: string | null
  contract?: string | null
  due_date?: string | null
  amount_before_tax?: number | null
  vat_rate?: string | null
  tax_amount?: number | null
  total_amount?: number | null
  outstanding?: number | null
  /** Đề nghị khác đang chứa đợt. */
  payment_request?: string | null
  customer?: string | null
}

export interface ItemForm {
  schedule: string
  schedule_name: string
  contract: string
  due_date: string
  amount_before_tax: number
  vat_rate: string
  tax_amount: number
  total_amount: number
  outstanding: number
  /** Chỉ dùng ở giao diện: khách hàng của đợt và đề nghị khác đang chứa đợt. */
  customer?: string
  payment_request?: string
}

export const BANK_FIELDS = ['bank_account_holder', 'bank_account_no', 'bank_name', 'bank_branch'] as const
export type BankInfo = Record<(typeof BANK_FIELDS)[number], string>

export interface RequestForm extends BankInfo {
  customer: string
  request_date: string
  due_date: string
  notes: string
  items: ItemForm[]
}

export function emptyItem(): ItemForm {
  return {
    schedule: '',
    schedule_name: '',
    contract: '',
    due_date: '',
    amount_before_tax: 0,
    vat_rate: '',
    tax_amount: 0,
    total_amount: 0,
    outstanding: 0,
  }
}

/** Form thêm mới: ngày lập mặc định hôm nay, tài khoản nhận tiền điền sẵn từ Cài đặt công ty. */
export function emptyForm(today = '', bank: Partial<BankInfo> = {}): RequestForm {
  return {
    customer: '',
    request_date: today,
    due_date: '',
    notes: '',
    bank_account_holder: bank.bank_account_holder ?? '',
    bank_account_no: bank.bank_account_no ?? '',
    bank_name: bank.bank_name ?? '',
    bank_branch: bank.bank_branch ?? '',
    items: [emptyItem()],
  }
}

/** Luôn có sẵn 1 dòng trống: thêm dòng trống khi dòng cuối đã chọn đợt. */
export function ensureBlankRow(items: ItemForm[]): void {
  if (!items.length || items[items.length - 1].schedule) items.push(emptyItem())
}

/** Chọn đợt cho một dòng: chép các trường chỉ đọc từ đợt. */
export function applySchedule(item: ItemForm, schedule: RequestableSchedule | undefined): void {
  Object.assign(item, {
    schedule: schedule?.name ?? '',
    schedule_name: schedule?.schedule_name ?? '',
    contract: schedule?.contract ?? '',
    due_date: schedule?.due_date ?? '',
    amount_before_tax: Number(schedule?.amount_before_tax ?? 0),
    vat_rate: schedule?.vat_rate ?? '',
    tax_amount: Number(schedule?.tax_amount ?? 0),
    total_amount: Number(schedule?.total_amount ?? 0),
    outstanding: Number(schedule?.outstanding ?? 0),
    customer: schedule?.customer ?? '',
    payment_request: schedule?.payment_request ?? '',
  })
}

/**
 * Điền sẵn từ query `?schedules=`. Khách hàng là khách của đợt đầu tiên tìm thấy; đợt hợp lệ khi còn nợ (có trong
 * `available`) và cùng khách hàng, còn lại vào `skipped`. Đợt đã nằm trong đề nghị khác vẫn giữ: server báo khi lưu.
 */
export function prefillFromSchedules(
  names: string[],
  scheduleCustomers: Record<string, string>,
  available: RequestableSchedule[],
): { customer: string; items: ItemForm[]; skipped: string[] } {
  const customer = names.map((n) => scheduleCustomers[n]).find(Boolean) ?? ''
  const items: ItemForm[] = []
  const skipped: string[] = []
  for (const name of names) {
    const found = available.find((s) => s.name === name)
    if (!found || !customer || (scheduleCustomers[name] ?? customer) !== customer) {
      skipped.push(name)
      continue
    }
    const item = emptyItem()
    applySchedule(item, { ...found, customer })
    items.push(item)
  }
  ensureBlankRow(items)
  return { customer, items, skipped }
}

export const FORM_RULES: Rules<RequestForm> = {
  customer: { label: 'Khách hàng', required: true },
  request_date: { label: 'Ngày lập', required: true },
  due_date: {
    label: 'Hạn thanh toán',
    required: true,
    validate: (value, form) =>
      typeof value === 'string' && value && form.request_date && value < form.request_date ? MSG_DUE_BEFORE_REQUEST : null,
  },
  notes: { label: 'Ghi chú', maxLength: 1000 },
  bank_account_holder: { label: 'Chủ tài khoản', maxLength: 140 },
  bank_account_no: { label: 'Số tài khoản', maxLength: 140 },
  bank_name: { label: 'Ngân hàng', maxLength: 140 },
  bank_branch: { label: 'Chi nhánh', maxLength: 140 },
}

/** Lỗi các dòng đợt, khóa `items` (chung) hoặc `items.<i>.schedule`. Dòng trống bị bỏ qua. */
export function validateItems(
  form: Pick<RequestForm, 'items' | 'customer'>,
  savedSchedules: Iterable<string> = [],
): Record<string, string> {
  // Khớp controller: chỉ dòng mới thêm (đợt chưa có trong bản đã lưu) mới kiểm tra còn nợ.
  const saved = new Set(savedSchedules)
  const errors: Record<string, string> = {}
  const rows = form.items.map((item, i) => ({ item, i })).filter((r) => r.item.schedule)
  if (!rows.length) {
    errors.items = MSG_NO_ITEMS
    return errors
  }
  const seen = new Set<string>()
  for (const { item, i } of rows) {
    const key = `items.${i}.schedule`
    if (seen.has(item.schedule)) errors[key] = fmt(MSG_DUP_ROW, i + 1, item.schedule)
    else if (item.customer && form.customer && item.customer !== form.customer) {
      errors[key] = fmt(MSG_OTHER_CUSTOMER, i + 1, item.schedule)
    } else if (!saved.has(item.schedule) && Number(item.outstanding) <= 0) errors[key] = fmt(MSG_FULLY_PAID, i + 1, item.schedule)
    seen.add(item.schedule)
  }
  return errors
}

/** Kiểm tra cả form (quy tắc từng ô và các dòng đợt); trả về {khóa: câu lỗi}, rỗng nếu hợp lệ. */
export function validateForm(form: RequestForm, savedSchedules: Iterable<string> = []): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [key, rule] of Object.entries(FORM_RULES)) {
    const msg = checkField(rule!, (form as unknown as Record<string, unknown>)[key], form)
    if (msg) errors[key] = msg
  }
  return { ...errors, ...validateItems(form, savedSchedules) }
}

/** Tổng xem trước khi lưu (server tính lại khi lưu). */
export function formTotals(items: Pick<ItemForm, 'schedule' | 'amount_before_tax' | 'tax_amount' | 'total_amount'>[]) {
  const rows = items.filter((i) => i.schedule)
  const sum = (pick: (i: (typeof rows)[number]) => number) => rows.reduce((a, i) => a + Number(pick(i) ?? 0), 0)
  return { before: sum((i) => i.amount_before_tax), tax: sum((i) => i.tax_amount), total: sum((i) => i.total_amount) }
}

export interface RequestPayload extends BankInfo {
  customer: string
  request_date: string
  due_date: string
  notes: string | null
  items: { schedule: string }[]
}

const nul = (s: string) => (s && s.trim() ? s.trim() : null)

/** Dữ liệu gửi server: bỏ dòng trống, chỉ gửi mã đợt (các trường còn lại server tự điền). */
export function toPayload(form: RequestForm): RequestPayload {
  return {
    customer: form.customer,
    request_date: form.request_date,
    due_date: form.due_date,
    notes: nul(form.notes),
    bank_account_holder: form.bank_account_holder.trim(),
    bank_account_no: form.bank_account_no.trim(),
    bank_name: form.bank_name.trim(),
    bank_branch: form.bank_branch.trim(),
    items: form.items.filter((i) => i.schedule).map((i) => ({ schedule: i.schedule })),
  }
}

/** Chiều ngược lại của toPayload; luôn kèm 1 dòng trống ở cuối. */
export function fromDoc(doc: PaymentRequest): RequestForm {
  const items: ItemForm[] = (doc.items ?? []).map((i) => ({
    schedule: i.schedule,
    schedule_name: i.schedule_name ?? '',
    contract: i.contract ?? '',
    due_date: i.due_date ?? '',
    amount_before_tax: Number(i.amount_before_tax ?? 0),
    vat_rate: i.vat_rate ?? '',
    tax_amount: Number(i.tax_amount ?? 0),
    total_amount: Number(i.total_amount ?? 0),
    outstanding: Number(i.outstanding ?? 0),
  }))
  ensureBlankRow(items)
  return {
    customer: doc.customer ?? '',
    request_date: doc.request_date ?? '',
    due_date: doc.due_date ?? '',
    notes: doc.notes ?? '',
    bank_account_holder: doc.bank_account_holder ?? '',
    bank_account_no: doc.bank_account_no ?? '',
    bank_name: doc.bank_name ?? '',
    bank_branch: doc.bank_branch ?? '',
    items,
  }
}
