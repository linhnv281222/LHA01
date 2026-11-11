// Logic (không giao diện) của màn Hóa đơn: trạng thái, cột bảng, nhóm, bộ lọc, quy tắc kiểm tra, tính tổng, chuyển dữ liệu form <-> server.
// Quy tắc và câu báo lỗi khớp với contract_tracker/doctype/sales_invoice_record/sales_invoice_record.py.
import type { SalesInvoiceRecord, SalesInvoiceRecordItem, SalesInvoiceTaxRow } from '@/types/doctypes'
import { formatCurrency, type Column, type Rules, type StatusDef, type TreeNode } from '@/standard'

export const DOCTYPE = 'Sales Invoice Record'

export type { SalesInvoiceRecord, SalesInvoiceRecordItem, SalesInvoiceTaxRow } from '@/types/doctypes'

// ---- Thông báo (chép y nguyên từ sales_invoice_record.py) ----

export const MSG_NO_ITEMS = 'Hóa đơn phải có ít nhất 1 đợt thu.'
export const MSG_DUP_ROW = 'Dòng {0}: đợt {1} bị trùng trong hóa đơn.'
export const MSG_OTHER_CUSTOMER = 'Dòng {0}: đợt {1} không thuộc khách hàng của hóa đơn.'
export const MSG_BAD_CONTRACT = 'Dòng {0}: hợp đồng {1} đang ở trạng thái {2}, không xuất hóa đơn được.'
export const MSG_IN_OTHER_INVOICE = 'Dòng {0}: đợt {1} đã nằm trong hóa đơn {2}.'
export const MSG_DUP_NO = 'Số hóa đơn {0} ký hiệu {1} đã tồn tại.'
export const MSG_CANCELLED_LOCKED = 'Hóa đơn đã hủy, không sửa được.'
export const MSG_HAS_PAYMENT = 'Hóa đơn đã có tiền thu phân bổ, không hủy được.'

export function fmt(template: string, ...args: (string | number)[]): string {
  return template.replace(/\{(\d+)\}/g, (_m, i: string) => String(args[Number(i)] ?? ''))
}

// ---- Trạng thái ----

export const STATUSES = ['Hiệu lực', 'Đã hủy'] as const
export type InvoiceStatus = (typeof STATUSES)[number]

export const INVOICE_STATUS: Record<InvoiceStatus, StatusDef> = {
  'Hiệu lực': { label: 'Hiệu lực', icon: 'lucide-circle-check', tone: 'green' },
  'Đã hủy': { label: 'Đã hủy', icon: 'lucide-ban', tone: 'gray' },
}

export function statusOf(row: Pick<SalesInvoiceRecord, 'status'>): StatusDef {
  return INVOICE_STATUS[(row.status ?? 'Hiệu lực') as InvoiceStatus] ?? INVOICE_STATUS['Hiệu lực']
}

export const canCancelInvoice = (status: string | undefined | null) => status === 'Hiệu lực'
/** Hóa đơn Đã hủy không sửa được. */
export const isLocked = (status: string | undefined | null) => status === 'Đã hủy'

// ---- Danh sách ----

export const COLUMNS: Column<SalesInvoiceRecord>[] = [
  { key: '_index', label: 'STT', width: 56, type: 'index', pin: 'left' },
  { key: 'invoice_no', label: 'Số hóa đơn', width: 150, pin: 'left', required: true },
  { key: 'invoice_series', label: 'Ký hiệu', width: 120 },
  { key: 'customer_name', label: 'Khách hàng', width: 240 },
  { key: 'invoice_date', label: 'Ngày xuất', width: 120, type: 'date' },
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

/** Cây "Truy vấn nhóm": Tất cả → Hiệu lực / Đã hủy, kèm số lượng. */
export function groupTree(rows: Pick<SalesInvoiceRecord, 'status'>[]): TreeNode[] {
  return [
    {
      key: 'all',
      label: 'Tất cả hóa đơn',
      icon: 'lucide-layers',
      count: rows.length,
      children: STATUSES.map((s) => ({
        key: s,
        label: s,
        icon: INVOICE_STATUS[s].icon,
        count: rows.filter((r) => (r.status ?? 'Hiệu lực') === s).length,
      })),
    },
  ]
}

export interface PanelFilters {
  groups: string[]
  customer: string
  dateFrom: string
  dateTo: string
  invoiceNo: string
}

export function emptyFilters(): PanelFilters {
  return { groups: [...STATUSES], customer: '', dateFrom: '', dateTo: '', invoiceNo: '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFrappeFilters(f: PanelFilters): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: Record<string, any> = {}
  if (f.groups.length === 0) filters.name = ['in', []]
  else if (f.groups.length < STATUSES.length) filters.status = ['in', f.groups]
  if (f.customer) filters.customer = f.customer
  if (f.dateFrom && f.dateTo) filters.invoice_date = ['between', [f.dateFrom, f.dateTo]]
  else if (f.dateFrom) filters.invoice_date = ['>=', f.dateFrom]
  else if (f.dateTo) filters.invoice_date = ['<=', f.dateTo]
  if (f.invoiceNo.trim()) filters.invoice_no = ['like', `%${f.invoiceNo.trim()}%`]
  return filters
}

export function filtersActive(f: PanelFilters): boolean {
  const d = emptyFilters()
  return (
    f.customer !== d.customer ||
    f.dateFrom !== d.dateFrom ||
    f.dateTo !== d.dateTo ||
    f.invoiceNo !== d.invoiceNo ||
    f.groups.length !== d.groups.length
  )
}

/** Thẻ số liệu: Số hóa đơn hiệu lực, Tổng tiền (VND) của hóa đơn Hiệu lực, Đã hủy. */
export function statCards(rows: Pick<SalesInvoiceRecord, 'status' | 'grand_total'>[]) {
  const active = rows.filter((r) => (r.status ?? 'Hiệu lực') === 'Hiệu lực')
  const cancelled = rows.length - active.length
  const sum = active.reduce((acc, r) => acc + Number(r.grand_total ?? 0), 0)
  return [
    { key: 'Hiệu lực', label: 'Số hóa đơn hiệu lực', value: active.length, status: INVOICE_STATUS['Hiệu lực'] },
    { key: 'sum', label: 'Tổng tiền (VND)', value: formatCurrency(sum) },
    { key: 'Đã hủy', label: 'Đã hủy', value: cancelled, status: INVOICE_STATUS['Đã hủy'] },
  ]
}

export const ITEM_COLUMNS: Column<SalesInvoiceRecordItem>[] = [
  { key: 'schedule_name', label: 'Tên đợt', width: 220 },
  { key: 'contract', label: 'Hợp đồng', width: 150 },
  { key: 'due_date', label: 'Ngày đến hạn', width: 120, type: 'date' },
  { key: 'amount_before_tax', label: 'Trước thuế (VND)', width: 150, type: 'currency' },
  { key: 'vat_rate', label: 'Thuế suất', width: 140 },
  { key: 'tax_amount', label: 'Tiền thuế (VND)', width: 140, type: 'currency' },
  { key: 'total_amount', label: 'Tổng tiền (VND)', width: 150, type: 'currency' },
]

export const TAX_COLUMNS: Column<SalesInvoiceTaxRow>[] = [
  { key: 'vat_rate', label: 'Thuế suất', width: 160 },
  { key: 'amount_before_tax', label: 'Trước thuế (VND)', width: 160, type: 'currency' },
  { key: 'tax_amount', label: 'Tiền thuế (VND)', width: 150, type: 'currency' },
  { key: 'total_amount', label: 'Tổng tiền (VND)', width: 150, type: 'currency' },
]

// ---- Form ----

/** Đợt có thể chọn (kết quả của get_open_schedules). */
export interface OpenSchedule {
  name: string
  schedule_name?: string | null
  contract?: string | null
  due_date?: string | null
  amount_before_tax?: number | null
  vat_rate?: string | null
  tax_amount?: number | null
  total_amount?: number | null
  /** Khách hàng của đợt, nếu nguồn dữ liệu có (dùng để kiểm tra khác khách hàng). */
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
  /** Khách hàng của đợt đã chọn (chỉ dùng ở giao diện, không gửi server). */
  customer?: string
}

export interface InvoiceForm {
  customer: string
  invoice_no: string
  invoice_series: string
  invoice_date: string
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
  }
}

export function emptyForm(): InvoiceForm {
  return { customer: '', invoice_no: '', invoice_series: '', invoice_date: '', notes: '', items: [emptyItem()] }
}

/** Luôn có sẵn 1 dòng trống: thêm dòng trống khi dòng cuối đã chọn đợt. */
export function ensureBlankRow(items: ItemForm[]): void {
  if (!items.length || items[items.length - 1].schedule) items.push(emptyItem())
}

/** Chọn đợt cho một dòng: chép các trường chỉ đọc từ đợt. */
export function applySchedule(item: ItemForm, schedule: OpenSchedule | undefined): void {
  Object.assign(item, {
    schedule: schedule?.name ?? '',
    schedule_name: schedule?.schedule_name ?? '',
    contract: schedule?.contract ?? '',
    due_date: schedule?.due_date ?? '',
    amount_before_tax: Number(schedule?.amount_before_tax ?? 0),
    vat_rate: schedule?.vat_rate ?? '',
    tax_amount: Number(schedule?.tax_amount ?? 0),
    total_amount: Number(schedule?.total_amount ?? 0),
    customer: schedule?.customer ?? '',
  })
}

export const FORM_RULES: Rules<InvoiceForm> = {
  customer: { label: 'Khách hàng', required: true },
  invoice_no: { label: 'Số hóa đơn', required: true, maxLength: 140 },
  invoice_series: { label: 'Ký hiệu', maxLength: 140 },
  invoice_date: { label: 'Ngày xuất', required: true },
  notes: { label: 'Ghi chú', maxLength: 1000 },
}

/** Lỗi các dòng đợt, khóa `items` (chung) hoặc `items.<i>.schedule` (từng dòng). Dòng trống bị bỏ qua. */
export function validateItems(form: Pick<InvoiceForm, 'items' | 'customer'>): Record<string, string> {
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
    }
    seen.add(item.schedule)
  }
  return errors
}

export interface Totals {
  before: number
  tax: number
  total: number
  byTax: { vat_rate: string; amount_before_tax: number; tax_amount: number; total_amount: number }[]
}

/** Tổng hóa đơn và bảng "Theo thuế suất" (gom theo thuế suất, giữ thứ tự xuất hiện), khớp calculate_totals ở Python. */
export function computeTotals(items: Pick<ItemForm, 'schedule' | 'vat_rate' | 'amount_before_tax' | 'tax_amount' | 'total_amount'>[]): Totals {
  const groups = new Map<string, Totals['byTax'][number]>()
  for (const it of items) {
    if (!it.schedule) continue
    const g = groups.get(it.vat_rate) ?? { vat_rate: it.vat_rate, amount_before_tax: 0, tax_amount: 0, total_amount: 0 }
    g.amount_before_tax += Number(it.amount_before_tax ?? 0)
    g.tax_amount += Number(it.tax_amount ?? 0)
    g.total_amount += Number(it.total_amount ?? 0)
    groups.set(it.vat_rate, g)
  }
  const byTax = [...groups.values()]
  return {
    before: byTax.reduce((a, g) => a + g.amount_before_tax, 0),
    tax: byTax.reduce((a, g) => a + g.tax_amount, 0),
    total: byTax.reduce((a, g) => a + g.total_amount, 0),
    byTax,
  }
}

export interface InvoicePayload {
  customer: string
  invoice_no: string
  invoice_series: string | null
  invoice_date: string
  notes: string | null
  items: { schedule: string }[]
}

const nul = (s: string) => (s && s.trim() ? s.trim() : null)

/** Dữ liệu gửi server: bỏ dòng trống, chỉ gửi mã đợt (các trường còn lại server tự điền). */
export function toPayload(form: InvoiceForm): InvoicePayload {
  return {
    customer: form.customer,
    invoice_no: form.invoice_no.trim(),
    invoice_series: nul(form.invoice_series),
    invoice_date: form.invoice_date,
    notes: nul(form.notes),
    items: form.items.filter((i) => i.schedule).map((i) => ({ schedule: i.schedule })),
  }
}

/** Chiều ngược lại của toPayload; luôn kèm 1 dòng trống ở cuối. */
export function fromDoc(doc: SalesInvoiceRecord): InvoiceForm {
  const items: ItemForm[] = (doc.items ?? []).map((i) => ({
    schedule: i.schedule,
    schedule_name: i.schedule_name ?? '',
    contract: i.contract ?? '',
    due_date: i.due_date ?? '',
    amount_before_tax: Number(i.amount_before_tax ?? 0),
    vat_rate: i.vat_rate ?? '',
    tax_amount: Number(i.tax_amount ?? 0),
    total_amount: Number(i.total_amount ?? 0),
  }))
  ensureBlankRow(items)
  return {
    customer: doc.customer ?? '',
    invoice_no: doc.invoice_no ?? '',
    invoice_series: doc.invoice_series ?? '',
    invoice_date: doc.invoice_date ?? '',
    notes: doc.notes ?? '',
    items,
  }
}
