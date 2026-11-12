// Logic (không giao diện) của màn Biên bản nghiệm thu: trạng thái, cột bảng, nhóm, bộ lọc, quy tắc kiểm tra, chuyển dữ liệu form <-> server.
// Quy tắc và câu báo lỗi khớp với contract_tracker/doctype/acceptance_minutes/acceptance_minutes.py.
import type { AcceptanceMinutes, AcceptanceMinutesItem } from '@/types/doctypes'
import { checkField, type Column, type Rules, type StatusDef, type TreeNode } from '@/standard'

export const DOCTYPE = 'Acceptance Minutes'
export const PRINT_FORMAT = 'Biên bản nghiệm thu'

export type { AcceptanceMinutes, AcceptanceMinutesItem } from '@/types/doctypes'

// ---- Thông báo (chép y nguyên từ acceptance_minutes.py) ----

export const MSG_NO_ITEMS = 'Biên bản nghiệm thu phải có ít nhất 1 đợt thu.'
export const MSG_DUP_ROW = 'Dòng {0}: đợt {1} bị trùng trong biên bản.'
export const MSG_OTHER_CUSTOMER = 'Dòng {0}: đợt {1} không thuộc khách hàng của biên bản.'
export const MSG_NOT_REQUIRED = 'Dòng {0}: đợt {1} không cần nghiệm thu.'
export const MSG_IN_OTHER_MINUTES = 'Dòng {0}: đợt {1} đã nằm trong biên bản {2}.'
export const MSG_BAD_CONTRACT = 'Dòng {0}: hợp đồng {1} đang ở trạng thái {2}, không lập biên bản được.'
export const MSG_NEED_SCAN = 'Cần đính kèm file scan biên bản đã ký.'
export const MSG_SIGNED_LOCKED = 'Biên bản đã ký, chỉ sửa được ghi chú và file scan.'
export const MSG_STATUS_READONLY = 'Trạng thái biên bản chỉ đổi bằng nút Đánh dấu đã ký.'
export const MSG_DELETE_SIGNED = 'Chỉ xóa được biên bản Nháp.'

export function fmt(template: string, ...args: (string | number)[]): string {
  return template.replace(/\{(\d+)\}/g, (_m, i: string) => String(args[Number(i)] ?? ''))
}

// ---- Trạng thái ----

export const STATUSES = ['Nháp', 'Đã ký'] as const
export type MinutesStatus = (typeof STATUSES)[number]

export const MINUTES_STATUS: Record<MinutesStatus, StatusDef> = {
  Nháp: { label: 'Nháp', icon: 'lucide-file-pen-line', tone: 'gray' },
  'Đã ký': { label: 'Đã ký', icon: 'lucide-file-signature', tone: 'green' },
}

export function statusOf(row: Pick<AcceptanceMinutes, 'status'>): StatusDef {
  return MINUTES_STATUS[(row.status ?? 'Nháp') as MinutesStatus] ?? MINUTES_STATUS['Nháp']
}

/** Biên bản Đã ký khóa sửa, trừ ghi chú và file scan. */
export const isLocked = (status: string | undefined | null) => status === 'Đã ký'
export const canMarkSigned = (status: string | undefined | null) => (status ?? 'Nháp') === 'Nháp'
export const canDelete = (status: string | undefined | null) => (status ?? 'Nháp') === 'Nháp'

/** Đường dẫn tải bản in PDF theo Print Format "Biên bản nghiệm thu". */
export function printUrl(name: string): string {
  return (
    '/api/method/frappe.utils.print_format.download_pdf' +
    `?doctype=${encodeURIComponent(DOCTYPE)}&name=${encodeURIComponent(name)}&format=${encodeURIComponent(PRINT_FORMAT)}`
  )
}

// ---- Danh sách ----

export const COLUMNS: Column<AcceptanceMinutes>[] = [
  { key: '_index', label: 'STT', width: 56, type: 'index', pin: 'left' },
  { key: 'name', label: 'Số biên bản', width: 160, pin: 'left', required: true },
  { key: 'customer_name', label: 'Khách hàng', width: 240 },
  { key: 'minutes_date', label: 'Ngày nghiệm thu', width: 140, type: 'date' },
  { key: 'schedule_count', label: 'Số đợt', width: 90 },
  { key: 'grand_total', label: 'Giá trị các đợt sau thuế (VND)', width: 200, type: 'currency', sum: true },
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

export const ITEM_COLUMNS: Column<AcceptanceMinutesItem>[] = [
  { key: 'contract', label: 'Hợp đồng', width: 150 },
  { key: 'item_name', label: 'Hạng mục', width: 180 },
  { key: 'schedule_name', label: 'Đợt', width: 200 },
  { key: 'period_from', label: 'Kỳ từ', width: 110, type: 'date' },
  { key: 'period_to', label: 'Kỳ đến', width: 110, type: 'date' },
  { key: 'due_date', label: 'Hạn', width: 110, type: 'date' },
  { key: 'total_amount', label: 'Tổng tiền (VND)', width: 150, type: 'currency' },
]

/** Cây "Truy vấn nhóm": Tất cả biên bản → Nháp / Đã ký, kèm số lượng. */
export function groupTree(rows: Pick<AcceptanceMinutes, 'status'>[]): TreeNode[] {
  return [
    {
      key: 'all',
      label: 'Tất cả biên bản',
      icon: 'lucide-layers',
      count: rows.length,
      children: STATUSES.map((s) => ({
        key: s,
        label: s,
        icon: MINUTES_STATUS[s].icon,
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
  minutesNo: string
}

export function emptyFilters(): PanelFilters {
  return { groups: [...STATUSES], customer: '', dateFrom: '', dateTo: '', minutesNo: '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFrappeFilters(f: PanelFilters): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: Record<string, any> = {}
  // Bỏ chọn hết nhóm: trả điều kiện không khớp bản ghi nào, không để ô Số biên bản ghi đè.
  if (f.groups.length === 0) return { name: ['in', []] }
  if (f.groups.length < STATUSES.length) filters.status = ['in', f.groups]
  if (f.customer) filters.customer = f.customer
  if (f.dateFrom && f.dateTo) filters.minutes_date = ['between', [f.dateFrom, f.dateTo]]
  else if (f.dateFrom) filters.minutes_date = ['>=', f.dateFrom]
  else if (f.dateTo) filters.minutes_date = ['<=', f.dateTo]
  if (f.minutesNo.trim()) filters.name = ['like', `%${f.minutesNo.trim()}%`]
  return filters
}

export function filtersActive(f: PanelFilters): boolean {
  const d = emptyFilters()
  return (
    f.customer !== d.customer ||
    f.dateFrom !== d.dateFrom ||
    f.dateTo !== d.dateTo ||
    f.minutesNo !== d.minutesNo ||
    f.groups.length !== d.groups.length
  )
}

/** Thẻ số liệu: Tổng số biên bản, Nháp, Đã ký, Số đợt đã nghiệm thu (đợt của các biên bản Đã ký). */
export function statCards(rows: Pick<AcceptanceMinutes, 'status' | 'schedule_count'>[]) {
  const count = (s: MinutesStatus) => rows.filter((r) => (r.status ?? 'Nháp') === s).length
  const accepted = rows
    .filter((r) => r.status === 'Đã ký')
    .reduce((acc, r) => acc + Number(r.schedule_count ?? 0), 0)
  return [
    { key: 'total', label: 'Tổng số biên bản', value: rows.length },
    { key: 'Nháp', label: 'Biên bản Nháp', value: count('Nháp'), status: MINUTES_STATUS['Nháp'] },
    { key: 'Đã ký', label: 'Biên bản Đã ký', value: count('Đã ký'), status: MINUTES_STATUS['Đã ký'] },
    { key: 'accepted', label: 'Số đợt đã nghiệm thu', value: accepted },
  ]
}

// ---- Form ----

/** Đợt có thể chọn (kết quả của get_acceptable_schedules). */
export interface AcceptableSchedule {
  name: string
  schedule_name?: string | null
  item_name?: string | null
  contract?: string | null
  period_from?: string | null
  period_to?: string | null
  due_date?: string | null
  total_amount?: number | null
  requires_acceptance?: number | boolean | null
  /** Biên bản khác đang chứa đợt. */
  acceptance_minutes?: string | null
  customer?: string | null
}

export interface ItemForm {
  schedule: string
  schedule_name: string
  item_name: string
  contract: string
  period_from: string
  period_to: string
  due_date: string
  total_amount: number
  /** Chỉ dùng ở giao diện. */
  customer?: string
  requires_acceptance?: boolean
  acceptance_minutes?: string
}

export interface MinutesForm {
  customer: string
  minutes_date: string
  notes: string
  content: string
  party_a_rep: string
  party_b_rep: string
  scan_file: string
  items: ItemForm[]
}

export function emptyItem(): ItemForm {
  return {
    schedule: '',
    schedule_name: '',
    item_name: '',
    contract: '',
    period_from: '',
    period_to: '',
    due_date: '',
    total_amount: 0,
  }
}

export function emptyForm(today = ''): MinutesForm {
  return {
    customer: '',
    minutes_date: today,
    notes: '',
    content: '',
    party_a_rep: '',
    party_b_rep: '',
    scan_file: '',
    items: [emptyItem()],
  }
}

/** Luôn có sẵn 1 dòng trống: thêm dòng trống khi dòng cuối đã chọn đợt. */
export function ensureBlankRow(items: ItemForm[]): void {
  if (!items.length || items[items.length - 1].schedule) items.push(emptyItem())
}

/** Chọn đợt cho một dòng: chép các trường chỉ đọc từ đợt. */
export function applySchedule(item: ItemForm, schedule: AcceptableSchedule | undefined): void {
  Object.assign(item, {
    schedule: schedule?.name ?? '',
    schedule_name: schedule?.schedule_name ?? '',
    item_name: schedule?.item_name ?? '',
    contract: schedule?.contract ?? '',
    period_from: schedule?.period_from ?? '',
    period_to: schedule?.period_to ?? '',
    due_date: schedule?.due_date ?? '',
    total_amount: Number(schedule?.total_amount ?? 0),
    customer: schedule?.customer ?? '',
    requires_acceptance: schedule ? schedule.requires_acceptance !== 0 && schedule.requires_acceptance !== false : undefined,
    acceptance_minutes: schedule?.acceptance_minutes ?? '',
  })
}

const dmy = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** Nội dung nghiệm thu mặc định, đúng định dạng của `content_from_items` ở Python: mỗi đợt một dòng. */
export function contentFromItems(
  items: Pick<ItemForm, 'schedule' | 'item_name' | 'schedule_name' | 'period_from' | 'period_to'>[],
): string {
  return items
    .filter((i) => i.schedule)
    .map((i) => {
      let line = `${i.item_name || ''} - ${i.schedule_name || ''}`
      if (i.period_from) line += ` (${dmy(i.period_from)} - ${dmy(i.period_to || i.period_from)})`
      return line
    })
    .join('\n')
}

/**
 * Điền sẵn từ query `?schedules=`. Khách hàng là khách của đợt đầu tiên tìm thấy; đợt hợp lệ khi có trong danh sách
 * chọn được (cần nghiệm thu) và cùng khách hàng, còn lại vào `skipped`.
 */
export function prefillFromSchedules(
  names: string[],
  scheduleCustomers: Record<string, string>,
  available: AcceptableSchedule[],
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

export const FORM_RULES: Rules<MinutesForm> = {
  customer: { label: 'Khách hàng', required: true },
  minutes_date: { label: 'Ngày nghiệm thu', required: true },
  notes: { label: 'Ghi chú', maxLength: 1000 },
  party_a_rep: { label: 'Đại diện bên A', maxLength: 140 },
  party_b_rep: { label: 'Đại diện bên B', maxLength: 140 },
}

/** Lỗi các dòng đợt, khóa `items` (chung) hoặc `items.<i>.schedule`. Dòng trống bị bỏ qua. */
export function validateItems(
  form: Pick<MinutesForm, 'items' | 'customer'>,
  // Giữ cùng chữ ký với paymentRequest: trạng thái hợp đồng chỉ server kiểm (không có dữ liệu ở giao diện).
  _savedSchedules: Iterable<string> = [],
): Record<string, string> {
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
    } else if (item.requires_acceptance === false) errors[key] = fmt(MSG_NOT_REQUIRED, i + 1, item.schedule)
    else if (item.acceptance_minutes) errors[key] = fmt(MSG_IN_OTHER_MINUTES, i + 1, item.schedule, item.acceptance_minutes)
    seen.add(item.schedule)
  }
  return errors
}

/** Kiểm tra cả form (quy tắc từng ô và các dòng đợt); trả về {khóa: câu lỗi}, rỗng nếu hợp lệ. */
export function validateForm(form: MinutesForm, savedSchedules: Iterable<string> = []): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [key, rule] of Object.entries(FORM_RULES)) {
    const msg = checkField(rule!, (form as unknown as Record<string, unknown>)[key], form)
    if (msg) errors[key] = msg
  }
  return { ...errors, ...validateItems(form, savedSchedules) }
}

/** Tổng xem trước khi lưu (server tính lại khi lưu). */
export function formTotals(items: Pick<ItemForm, 'schedule' | 'total_amount'>[]) {
  const rows = items.filter((i) => i.schedule)
  return { count: rows.length, total: rows.reduce((a, i) => a + Number(i.total_amount ?? 0), 0) }
}

export interface MinutesPayload {
  customer: string
  minutes_date: string
  notes: string | null
  content: string | null
  party_a_rep: string
  party_b_rep: string
  scan_file: string | null
  items: { schedule: string }[]
}

const nul = (s: string) => (s && s.trim() ? s.trim() : null)

/** Dữ liệu gửi server: bỏ dòng trống, chỉ gửi mã đợt (các trường còn lại server tự điền). */
export function toPayload(form: MinutesForm): MinutesPayload {
  return {
    customer: form.customer,
    minutes_date: form.minutes_date,
    notes: nul(form.notes),
    content: nul(form.content),
    party_a_rep: form.party_a_rep.trim(),
    party_b_rep: form.party_b_rep.trim(),
    scan_file: nul(form.scan_file),
    items: form.items.filter((i) => i.schedule).map((i) => ({ schedule: i.schedule })),
  }
}

/** Chiều ngược lại của toPayload; luôn kèm 1 dòng trống ở cuối. */
export function fromDoc(doc: AcceptanceMinutes): MinutesForm {
  const items: ItemForm[] = (doc.items ?? []).map((i) => ({
    schedule: i.schedule,
    schedule_name: i.schedule_name ?? '',
    item_name: i.item_name ?? '',
    contract: i.contract ?? '',
    period_from: i.period_from ?? '',
    period_to: i.period_to ?? '',
    due_date: i.due_date ?? '',
    total_amount: Number(i.total_amount ?? 0),
  }))
  ensureBlankRow(items)
  return {
    customer: doc.customer ?? '',
    minutes_date: doc.minutes_date ?? '',
    notes: doc.notes ?? '',
    content: doc.content ?? '',
    party_a_rep: doc.party_a_rep ?? '',
    party_b_rep: doc.party_b_rep ?? '',
    scan_file: doc.scan_file ?? '',
    items,
  }
}
