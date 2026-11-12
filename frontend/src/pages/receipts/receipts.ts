// Logic (không giao diện) của màn Phiếu thu: cột bảng, nhóm, bộ lọc, quy tắc kiểm tra, phân bổ, chuyển dữ liệu form <-> server.
// Quy tắc và câu báo lỗi khớp với contract_tracker/doctype/payment_receipt/payment_receipt.py.
import type { PaymentReceipt, PaymentReceiptAllocation } from '@/types/doctypes'
import { formatCurrency, type Column, type Rules, type TreeNode } from '@/standard'

export const DOCTYPE = 'Payment Receipt'

export type { PaymentReceipt, PaymentReceiptAllocation } from '@/types/doctypes'

// ---- Thông báo (chép y nguyên từ payment_receipt.py) ----

export const MSG_AMOUNT_POSITIVE = 'Số tiền phải lớn hơn 0.'
export const MSG_ALLOC_POSITIVE = 'Dòng {0}: số phân bổ phải lớn hơn 0.'
export const MSG_DUP_ROW = 'Dòng {0}: đợt {1} bị trùng trong phiếu thu.'
export const MSG_OTHER_CUSTOMER = 'Dòng {0}: đợt {1} không thuộc khách hàng của phiếu thu.'
export const MSG_BAD_CONTRACT = 'Dòng {0}: hợp đồng {1} đang ở trạng thái {2}, không thu được.'
export const MSG_OVER_OUTSTANDING = 'Dòng {0}: số phân bổ {1} vượt số còn nợ {2} của đợt {3}.'
export const MSG_OVER_AMOUNT = 'Tổng phân bổ {0} vượt số tiền phiếu thu {1}.'

export function fmt(template: string, ...args: (string | number)[]): string {
  return template.replace(/\{(\d+)\}/g, (_m, i: string) => String(args[Number(i)] ?? ''))
}

/** Dung sai như TOLERANCE ở contract.py. */
const TOLERANCE = 0.01

// ---- Danh sách ----

export const METHODS = ['Chuyển khoản', 'Tiền mặt'] as const

export const COLUMNS: Column<PaymentReceipt>[] = [
  { key: '_index', label: 'STT', width: 56, type: 'index', pin: 'left' },
  { key: 'name', label: 'Số phiếu', width: 150, pin: 'left', required: true },
  { key: 'customer_name', label: 'Khách hàng', width: 240 },
  { key: 'receipt_date', label: 'Ngày thu', width: 120, type: 'date' },
  {
    key: 'method',
    label: 'Hình thức',
    width: 140,
    filter: 'select',
    options: METHODS.map((m) => ({ label: m, value: m })),
  },
  { key: 'amount', label: 'Số tiền (VND)', width: 160, type: 'currency', sum: true },
  { key: 'allocated_total', label: 'Đã phân bổ (VND)', width: 170, type: 'currency', sum: true },
  { key: 'unallocated_amount', label: 'Chưa phân bổ (VND)', width: 180, type: 'currency', sum: true },
  { key: '_actions', label: 'Thao tác', width: 170, pin: 'right', sortable: false, filter: 'none', required: true },
]

const METHOD_ICON: Record<string, string> = { 'Chuyển khoản': 'lucide-landmark', 'Tiền mặt': 'lucide-banknote' }

/** Cây "Truy vấn nhóm": Tất cả → từng hình thức, kèm số lượng. */
export function groupTree(rows: Pick<PaymentReceipt, 'method'>[]): TreeNode[] {
  return [
    {
      key: 'all',
      label: 'Tất cả phiếu thu',
      icon: 'lucide-layers',
      count: rows.length,
      children: METHODS.map((m) => ({
        key: m,
        label: m,
        icon: METHOD_ICON[m],
        count: rows.filter((r) => r.method === m).length,
      })),
    },
  ]
}

export interface PanelFilters {
  groups: string[]
  customer: string
  dateFrom: string
  dateTo: string
}

export function emptyFilters(): PanelFilters {
  return { groups: [...METHODS], customer: '', dateFrom: '', dateTo: '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFrappeFilters(f: PanelFilters): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: Record<string, any> = {}
  if (f.groups.length === 0) filters.name = ['in', []]
  else if (f.groups.length < METHODS.length) filters.method = ['in', f.groups]
  if (f.customer) filters.customer = f.customer
  if (f.dateFrom && f.dateTo) filters.receipt_date = ['between', [f.dateFrom, f.dateTo]]
  else if (f.dateFrom) filters.receipt_date = ['>=', f.dateFrom]
  else if (f.dateTo) filters.receipt_date = ['<=', f.dateTo]
  return filters
}

export function filtersActive(f: PanelFilters): boolean {
  const d = emptyFilters()
  return (
    f.customer !== d.customer || f.dateFrom !== d.dateFrom || f.dateTo !== d.dateTo || f.groups.length !== d.groups.length
  )
}

/** Thẻ số liệu: Số phiếu, Tổng thu (VND), Chưa phân bổ (VND). */
export function statCards(rows: Pick<PaymentReceipt, 'amount' | 'unallocated_amount'>[]) {
  const sum = (pick: (r: (typeof rows)[number]) => number | null | undefined) =>
    rows.reduce((acc, r) => acc + Number(pick(r) ?? 0), 0)
  return [
    { key: 'count', label: 'Số phiếu', value: rows.length },
    { key: 'total', label: 'Tổng thu (VND)', value: formatCurrency(sum((r) => r.amount)) },
    { key: 'unallocated', label: 'Chưa phân bổ (VND)', value: formatCurrency(sum((r) => r.unallocated_amount)) },
  ]
}

export const ALLOC_COLUMNS: Column<PaymentReceiptAllocation>[] = [
  { key: 'schedule_name', label: 'Tên đợt', width: 220 },
  { key: 'contract', label: 'Hợp đồng', width: 150 },
  { key: 'due_date', label: 'Ngày đến hạn', width: 120, type: 'date' },
  { key: 'outstanding_amount', label: 'Còn nợ (VND)', width: 150, type: 'currency' },
  { key: 'allocated_amount', label: 'Số phân bổ (VND)', width: 160, type: 'currency' },
]

// ---- Form ----

export interface AllocationForm {
  schedule: string
  allocated_amount: number | null
  schedule_name: string
  contract: string
  due_date: string
  /** Còn nợ của đợt (không tính phiếu này). */
  outstanding: number
}

export interface ReceiptForm {
  customer: string
  receipt_date: string
  amount: number | null
  method: string
  notes: string
  allocations: AllocationForm[]
}

export function emptyAllocation(): AllocationForm {
  return { schedule: '', allocated_amount: null, schedule_name: '', contract: '', due_date: '', outstanding: 0 }
}

export function emptyForm(): ReceiptForm {
  return { customer: '', receipt_date: '', amount: null, method: 'Chuyển khoản', notes: '', allocations: [emptyAllocation()] }
}

/** Luôn có sẵn 1 dòng trống: thêm dòng trống khi dòng cuối đã chọn đợt. */
export function ensureBlankRow(rows: AllocationForm[]): void {
  if (!rows.length || rows[rows.length - 1].schedule) rows.push(emptyAllocation())
}

/**
 * Điền sẵn phân bổ từ query `?schedules=`. Đợt hợp lệ khi có trong `receivable` (còn nợ) và cùng khách hàng;
 * mỗi đợt phân bổ đúng số còn nợ, số tiền phiếu = tổng còn nợ. Luôn kèm 1 dòng trống ở cuối.
 */
export function prefillAllocations(
  names: string[],
  scheduleCustomers: Record<string, string>,
  receivable: ReceivableSchedule[],
  customer: string,
): { allocations: AllocationForm[]; amount: number | null; skipped: string[] } {
  const allocations: AllocationForm[] = []
  const skipped: string[] = []
  let amount = 0
  for (const name of names) {
    const s = receivable.find((r) => r.name === name)
    if (!s || !customer || (scheduleCustomers[name] ?? customer) !== customer || !(s.outstanding > 0)) {
      skipped.push(name)
      continue
    }
    allocations.push({
      schedule: s.name,
      schedule_name: s.schedule_name ?? '',
      contract: s.contract ?? '',
      due_date: s.due_date ?? '',
      outstanding: s.outstanding,
      allocated_amount: s.outstanding,
    })
    amount += s.outstanding
  }
  ensureBlankRow(allocations)
  return { allocations, amount: amount > 0 ? amount : null, skipped }
}

export const FORM_RULES: Rules<ReceiptForm> = {
  customer: { label: 'Khách hàng', required: true },
  receipt_date: { label: 'Ngày thu', required: true },
  amount: {
    label: 'Số tiền',
    required: true,
    validate: (v) => (Number(v) > 0 ? null : MSG_AMOUNT_POSITIVE),
  },
  method: { label: 'Hình thức', required: true },
  notes: { label: 'Ghi chú', maxLength: 1000 },
}

/**
 * Lỗi phân bổ: khóa `allocations.<i>.allocated_amount` / `allocations.<i>.schedule` cho từng dòng,
 * `allocations` cho lỗi chung (tổng vượt số tiền). `outstandingMap` là còn nợ của từng đợt (không tính phiếu này).
 */
export function validateAllocations(
  form: Pick<ReceiptForm, 'amount' | 'allocations'>,
  outstandingMap: Record<string, number> = {},
): Record<string, string> {
  const errors: Record<string, string> = {}
  const seen = new Set<string>()
  let total = 0
  form.allocations.forEach((row, i) => {
    if (!row.schedule) return
    const n = i + 1
    const amountKey = `allocations.${i}.allocated_amount`
    const value = Number(row.allocated_amount ?? 0)
    if (!(value > 0)) errors[amountKey] = fmt(MSG_ALLOC_POSITIVE, n)
    if (seen.has(row.schedule)) errors[`allocations.${i}.schedule`] = fmt(MSG_DUP_ROW, n, row.schedule)
    seen.add(row.schedule)
    const outstanding = outstandingMap[row.schedule] ?? row.outstanding
    if (!errors[amountKey] && value - outstanding > TOLERANCE) {
      errors[amountKey] = fmt(MSG_OVER_OUTSTANDING, n, formatCurrency(value), formatCurrency(outstanding), row.schedule)
    }
    total += value
  })
  if (total - Number(form.amount ?? 0) > TOLERANCE) {
    errors.allocations = fmt(MSG_OVER_AMOUNT, formatCurrency(total), formatCurrency(Number(form.amount ?? 0)))
  }
  return errors
}

/** Dòng tóm tắt: đã phân bổ và chưa phân bổ. */
export function allocationSummary(form: Pick<ReceiptForm, 'amount' | 'allocations'>): { allocated: number; unallocated: number } {
  const allocated = form.allocations.reduce((acc, r) => acc + (r.schedule ? Number(r.allocated_amount ?? 0) : 0), 0)
  return { allocated, unallocated: Number(form.amount ?? 0) - allocated }
}

/** Kết quả suggest_allocation của server (hoặc suggestAllocation ở đây). */
export interface Suggestion {
  schedule: string
  allocated_amount: number
  schedule_name?: string | null
  contract?: string | null
  due_date?: string | null
  outstanding?: number
}

/** Thay bảng phân bổ bằng kết quả gợi ý (người dùng sửa được sau đó); luôn kèm 1 dòng trống. */
export function applySuggestion(form: Pick<ReceiptForm, 'allocations'>, rows: Suggestion[]): void {
  form.allocations = rows.map((r) => ({
    schedule: r.schedule,
    allocated_amount: r.allocated_amount,
    schedule_name: r.schedule_name ?? '',
    contract: r.contract ?? '',
    due_date: r.due_date ?? '',
    outstanding: Number(r.outstanding ?? r.allocated_amount),
  }))
  ensureBlankRow(form.allocations)
}

export interface ReceivableSchedule {
  name: string
  schedule_name?: string | null
  contract?: string | null
  due_date?: string | null
  total_amount?: number | null
  outstanding: number
  /** Hóa đơn Hiệu lực chứa đợt. */
  invoice?: string | null
}

/**
 * Bản thuần ở client của quy tắc 8 (chỉ để test và đối chiếu; form gọi API suggest_allocation):
 * đợt thuộc hóa đơn được chọn trước, rồi theo ngày đến hạn, rồi theo mã; phân bổ tuần tự đến hết tiền.
 */
export function suggestAllocation(schedules: ReceivableSchedule[], amount: number, invoice?: string | null): Suggestion[] {
  const sorted = [...schedules].sort(
    (a, b) =>
      Number(!(invoice && a.invoice === invoice)) - Number(!(invoice && b.invoice === invoice)) ||
      String(a.due_date ?? '').localeCompare(String(b.due_date ?? '')) ||
      a.name.localeCompare(b.name),
  )
  let remaining = Number(amount)
  const result: Suggestion[] = []
  for (const s of sorted) {
    if (!(remaining > 0)) break
    if (!(s.outstanding > TOLERANCE)) continue
    const part = Math.min(remaining, s.outstanding)
    result.push({
      schedule: s.name,
      allocated_amount: part,
      schedule_name: s.schedule_name,
      contract: s.contract,
      due_date: s.due_date,
      outstanding: s.outstanding,
    })
    remaining -= part
  }
  return result
}

export interface ReceiptPayload {
  customer: string
  receipt_date: string
  amount: number
  method: string
  notes: string | null
  allocations: { schedule: string; allocated_amount: number }[]
}

/** Dữ liệu gửi server: bỏ dòng phân bổ trống; chỉ gửi đợt và số phân bổ. */
export function toPayload(form: ReceiptForm): ReceiptPayload {
  return {
    customer: form.customer,
    receipt_date: form.receipt_date,
    amount: Number(form.amount ?? 0),
    method: form.method,
    notes: form.notes.trim() || null,
    allocations: form.allocations
      .filter((r) => r.schedule)
      .map((r) => ({ schedule: r.schedule, allocated_amount: Number(r.allocated_amount ?? 0) })),
  }
}

/** Chiều ngược lại của toPayload; luôn kèm 1 dòng trống. Còn nợ của dòng đã lưu = còn nợ lúc lưu. */
export function fromDoc(doc: PaymentReceipt): ReceiptForm {
  const allocations: AllocationForm[] = (doc.allocations ?? []).map((a) => ({
    schedule: a.schedule,
    allocated_amount: Number(a.allocated_amount ?? 0),
    schedule_name: a.schedule_name ?? '',
    contract: a.contract ?? '',
    due_date: a.due_date ?? '',
    outstanding: Number(a.outstanding_amount ?? 0),
  }))
  ensureBlankRow(allocations)
  return {
    customer: doc.customer ?? '',
    receipt_date: doc.receipt_date ?? '',
    amount: doc.amount ? Number(doc.amount) : null,
    method: doc.method || 'Chuyển khoản',
    notes: doc.notes ?? '',
    allocations,
  }
}
