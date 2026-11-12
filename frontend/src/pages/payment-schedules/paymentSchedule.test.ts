import { describe, expect, it } from 'vitest'
import { computeTotals, formatCurrency } from '@/standard'
import {
  COLUMNS,
  MSG_EMPTY,
  MSG_INVOICED,
  MSG_NO_SELECTION,
  MSG_PAID,
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
  parseScheduleQuery,
  periodRange,
  quickCards,
  statCards,
  toFrappeFilters,
  toScheduleQuery,
  togglePick,
  type ScheduleListRow,
} from './paymentSchedule'

const TODAY = '2026-11-11'

function row(name: string, extra: Partial<ScheduleListRow> = {}): ScheduleListRow {
  return {
    name,
    contract: 'HD-001',
    customer: 'KH-A',
    customer_name: 'Công ty A',
    schedule_name: name,
    due_date: '2026-11-20',
    amount_before_tax: 100,
    tax_amount: 10,
    total_amount: 110,
    paid_amount: 0,
    requires_acceptance: 1,
    acceptance_status: 'Chưa',
    request_status: 'Chưa lập',
    invoice_status: 'Chưa xuất',
    payment_status: 'Chưa thu',
    is_overdue: 0,
    ...extra,
  }
}

const names = (rows: ScheduleListRow[]) => rows.map((r) => r.name)

describe('cột và thứ tự mặc định', () => {
  it('có đủ cột trạng thái và cột ghim', () => {
    const labels = COLUMNS.map((c) => c.label)
    for (const l of ['Nghiệm thu', 'Đề nghị thanh toán', 'Hóa đơn', 'Thanh toán', 'Quá hạn']) expect(labels).toContain(l)
    expect(COLUMNS.filter((c) => c.pin === 'left').map((c) => c.key)).toEqual(['_pick', '_index', 'contract'])
    expect(COLUMNS.every((c) => c.width > 0)).toBe(true)
  })
  it('cột tiền có dòng Tổng, cột ít dùng ẩn mặc định', () => {
    expect(COLUMNS.filter((c) => c.sum).map((c) => c.key)).toEqual([
      'amount_before_tax', 'tax_amount', 'total_amount', 'paid_amount', '_outstanding',
    ])
    expect(COLUMNS.filter((c) => c.hidden).map((c) => c.label)).toEqual(['Kỳ từ', 'Kỳ đến', 'Thuế suất', 'Người phụ trách'])
  })
  it('sắp xếp mặc định theo ngày đến hạn tăng dần', () => {
    expect(ORDER_BY).toBe('due_date asc, name asc')
  })
  it('cột người phụ trách hiện tên, chưa biết tên thì hiện mã', () => {
    const col = makeColumns((u) => (u === 'a@x.vn' ? 'Nguyễn A' : u)).find((c) => c.key === 'responsible_user')
    expect(col?.format?.(row('1', { responsible_user: 'a@x.vn' }))).toBe('Nguyễn A')
    expect(col?.format?.(row('1', { responsible_user: 'b@x.vn' }))).toBe('b@x.vn')
    expect(col?.format?.(row('1'))).toBe('')
  })
  it('còn nợ = tổng tiền − đã thu', () => {
    expect(outstandingOf(row('1', { total_amount: 110, paid_amount: 40 }))).toBe(70)
  })
  it('thông báo trống đúng nội dung', () => {
    expect(MSG_EMPTY).toBe('Chưa có đợt thu nào. Kích hoạt hợp đồng để sinh lịch thu.')
  })
})

describe('ví dụ HD-001: Tổng tiền các đợt', () => {
  it('cộng cột Tổng tiền được 175.400.000', () => {
    const rows = [33_000_000, 77_000_000, 60_000_000, 5_400_000].map((t, i) => row(`DT-${i}`, { total_amount: t }))
    expect(computeTotals(rows, COLUMNS).total_amount).toBe(175_400_000)
  })
  it('cột Còn nợ cũng được cộng', () => {
    const rows = [row('1', { total_amount: 100, paid_amount: 30 }), row('2', { total_amount: 50, paid_amount: 0 })]
    expect(computeTotals(rows, COLUMNS)._outstanding).toBe(120)
  })
})

describe('lọc nhanh', () => {
  const rows = [
    row('over', { is_overdue: 1, due_date: '2026-10-01' }),
    row('thisMonth'),
    row('thisMonthPaid', { payment_status: 'Đã thu', paid_amount: 110 }),
    row('lastMonth', { due_date: '2026-10-15' }),
    row('otherYear', { due_date: '2025-11-15' }),
    row('noAcceptance', { requires_acceptance: 0, acceptance_status: 'Không cần' }),
    row('accepted', { acceptance_status: 'Đã ký' }),
    row('requested', { request_status: 'Đã lập' }),
    row('invoiced', { invoice_status: 'Đã xuất', invoice_no: 'HD1', payment_status: 'Chưa thu' }),
    row('invoicedPaid', { invoice_status: 'Đã xuất', invoice_no: 'HD2', payment_status: 'Đã thu', paid_amount: 110 }),
  ]
  it('không chọn thì trả đủ dòng (bấm lại để bỏ lọc)', () => {
    expect(applyQuick(rows, null, TODAY)).toHaveLength(rows.length)
  })
  it('Quá hạn chỉ còn đợt is_overdue = 1', () => {
    expect(names(applyQuick(rows, 'overdue', TODAY))).toEqual(['over'])
  })
  it('Đến hạn tháng này loại đợt thu đủ, tháng trước và năm khác', () => {
    const got = names(applyQuick(rows, 'due_this_month', TODAY))
    expect(got).toContain('thisMonth')
    for (const n of ['thisMonthPaid', 'lastMonth', 'otherYear', 'over']) expect(got).not.toContain(n)
  })
  it('Chưa nghiệm thu loại đợt "Không cần" và đã ký', () => {
    const got = names(applyQuick(rows, 'not_accepted', TODAY))
    expect(got).not.toContain('noAcceptance')
    expect(got).not.toContain('accepted')
    expect(got).toContain('thisMonth')
  })
  it('Chưa lập đề nghị', () => {
    const got = names(applyQuick(rows, 'no_request', TODAY))
    expect(got).not.toContain('requested')
    expect(got).toContain('thisMonth')
  })
  it('Chưa xuất hóa đơn', () => {
    const got = names(applyQuick(rows, 'not_invoiced', TODAY))
    expect(got).not.toContain('invoiced')
    expect(got).not.toContain('invoicedPaid')
    expect(got).toContain('thisMonth')
  })
  it('Đã xuất hóa đơn chưa thu loại đợt đã thu', () => {
    expect(names(applyQuick(rows, 'invoiced_unpaid', TODAY))).toEqual(['invoiced'])
  })
  it('hàng chip có 6 mục kèm số đợt', () => {
    const cards = quickCards(rows, TODAY)
    expect(cards).toHaveLength(6)
    expect(cards.find((c) => c.key === 'overdue')?.value).toBe(1)
    expect(cards.find((c) => c.key === 'invoiced_unpaid')?.value).toBe(1)
    expect(cards.find((c) => c.key === 'overdue')?.status?.tone).toBe('red')
  })
})

describe('bộ lọc panel', () => {
  const ALL = ['KH-A', 'KH-B']
  it('mặc định không lọc gì', () => {
    expect(toFrappeFilters(emptyFilters(), [])).toEqual({})
    expect(toFrappeFilters({ ...emptyFilters(), groups: ALL }, ALL)).toEqual({})
    expect(filtersActive({ ...emptyFilters(), groups: ALL }, ALL)).toBe(false)
  })
  it('khoảng ngày: đủ hai đầu hoặc một đầu', () => {
    const f = { ...emptyFilters(), groups: ALL }
    expect(toFrappeFilters({ ...f, dueFrom: '2026-11-01', dueTo: '2026-11-30' }, ALL)).toEqual({
      due_date: ['between', ['2026-11-01', '2026-11-30']],
    })
    expect(toFrappeFilters({ ...f, dueFrom: '2026-11-01' }, ALL)).toEqual({ due_date: ['>=', '2026-11-01'] })
    expect(toFrappeFilters({ ...f, dueTo: '2026-11-30' }, ALL)).toEqual({ due_date: ['<=', '2026-11-30'] })
  })
  it('khách hàng, người phụ trách, hợp đồng', () => {
    const f = { ...emptyFilters(), groups: ALL, customer: 'KH-A', responsibleUser: 'a@x.vn', contract: 'HD-001' }
    expect(toFrappeFilters(f, ALL)).toEqual({ customer: 'KH-A', responsible_user: 'a@x.vn', contract: 'HD-001' })
    expect(filtersActive(f, ALL)).toBe(true)
  })
  it('cây nhóm: một phần, rỗng, kết hợp ô khách hàng', () => {
    expect(toFrappeFilters({ ...emptyFilters(), groups: ['KH-A'] }, ALL)).toEqual({ customer: ['in', ['KH-A']] })
    expect(toFrappeFilters({ ...emptyFilters(), groups: [] }, ALL)).toEqual({ name: ['in', []] })
    expect(toFrappeFilters({ ...emptyFilters(), groups: ['KH-A'], customer: 'KH-B' }, ALL)).toEqual({ name: ['in', []] })
    expect(toFrappeFilters({ ...emptyFilters(), groups: ['KH-A'], customer: 'KH-A' }, ALL)).toEqual({ customer: 'KH-A' })
    expect(filtersActive({ ...emptyFilters(), groups: ['KH-A'] }, ALL)).toBe(true)
  })
  it('cây nhóm theo khách hàng, có số đợt, sắp theo tên', () => {
    const tree = groupTree([row('1'), row('2'), row('3', { customer: 'KH-B', customer_name: 'Âu Lạc' })])
    expect(tree[0].count).toBe(3)
    expect(tree[0].children?.map((c) => [c.key, c.label, c.count])).toEqual([
      ['KH-B', 'Âu Lạc', 1],
      ['KH-A', 'Công ty A', 2],
    ])
  })
})

describe('kỳ và thẻ số liệu', () => {
  it('mặc định là tháng hiện tại; một đầu thì đầu kia để mở', () => {
    expect(periodRange({ dueFrom: '', dueTo: '' }, TODAY)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(periodRange({ dueFrom: '', dueTo: '' }, '2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(periodRange({ dueFrom: '2026-01-01', dueTo: '' }, TODAY)).toEqual({ from: '2026-01-01', to: null })
  })
  const rows = [
    row('a', { due_date: '2026-11-05', total_amount: 100, paid_amount: 40, is_overdue: 0 }),
    row('b', { due_date: '2026-10-05', total_amount: 200, paid_amount: 0, is_overdue: 1 }),
    row('c', { due_date: '2026-11-25', total_amount: 50, paid_amount: 50, invoice_status: 'Đã xuất', payment_status: 'Đã thu' }),
  ]
  it('bốn thẻ, giá trị và số đợt đúng', () => {
    const cards = statCards(rows, periodRange({ dueFrom: '', dueTo: '' }, TODAY))
    expect(cards.map((c) => c.label)).toEqual([
      'Phải thu trong kỳ (VND)',
      'Đã thu (VND)',
      'Quá hạn (VND) · 1 đợt',
      'Chưa xuất hóa đơn (VND) · 2 đợt',
    ])
    expect(cards[0].value).toBe(formatCurrency(60))
    expect(cards[1].value).toBe(formatCurrency(90))
    expect(cards[2].value).toBe(formatCurrency(200))
    expect(cards[2].status?.tone).toBe('red')
    expect(cards[3].value).toBe(formatCurrency(300))
  })
  it('theo khoảng ngày đang lọc', () => {
    const cards = statCards(rows, { from: '2026-10-01', to: '2026-10-31' })
    expect(cards[0].value).toBe(formatCurrency(200))
  })
})

describe('chọn nhiều đợt', () => {
  const a1 = row('a1')
  const a2 = row('a2')
  const b1 = row('b1', { customer: 'KH-B' })
  it('canPick: chưa chọn, cùng khách, khác khách', () => {
    expect(canPick(b1, [])).toBe(true)
    expect(canPick(a2, [a1])).toBe(true)
    expect(canPick(b1, [a1])).toBe(false)
    expect(MSG_SAME_CUSTOMER).toBe('Chỉ chọn được các đợt của cùng một khách hàng.')
  })
  it('togglePick thêm, bỏ và từ chối đợt khác khách', () => {
    expect(togglePick([], a1, [])).toEqual(['a1'])
    expect(togglePick(['a1'], a2, [a1])).toEqual(['a1', 'a2'])
    expect(togglePick(['a1'], b1, [a1])).toEqual(['a1'])
    expect(togglePick(['a1', 'a2'], a1, [a1, a2])).toEqual(['a2'])
  })
  it('không chọn đợt nào thì hai nút tắt', () => {
    const s = actionState([])
    expect(s.invoice).toEqual({ enabled: false, reason: MSG_NO_SELECTION })
    expect(s.receipt.enabled).toBe(false)
  })
  it('đợt chưa xuất và còn nợ thì cả hai nút bật', () => {
    const s = actionState([a1, a2])
    expect(s.invoice.enabled).toBe(true)
    expect(s.receipt.enabled).toBe(true)
  })
  it('có đợt đã xuất thì nút hóa đơn tắt kèm tên đợt', () => {
    const s = actionState([a1, row('x', { schedule_name: 'Đợt X', invoice_status: 'Đã xuất' })])
    expect(s.invoice.enabled).toBe(false)
    expect(s.invoice.reason).toBe(MSG_INVOICED.replace('{0}', 'Đợt X'))
    expect(s.receipt.enabled).toBe(true)
  })
  it('có đợt đã thu đủ thì nút thu tiền tắt', () => {
    const s = actionState([row('p', { schedule_name: 'Đợt P', payment_status: 'Đã thu', paid_amount: 110 })])
    expect(s.receipt.enabled).toBe(false)
    expect(s.receipt.reason).toBe(MSG_PAID.replace('{0}', 'Đợt P'))
  })
  it('đường dẫn ?schedules= ghi và đọc lại, bỏ phần rỗng và trùng', () => {
    expect(toScheduleQuery(['DT-1', 'DT-2'])).toBe('DT-1,DT-2')
    expect(parseScheduleQuery('DT-1,,DT-2, DT-1')).toEqual(['DT-1', 'DT-2'])
    expect(parseScheduleQuery(undefined)).toEqual([])
    expect(parseScheduleQuery(['DT-1,DT-2', 'DT-3'])).toEqual(['DT-1', 'DT-2', 'DT-3'])
  })
})
