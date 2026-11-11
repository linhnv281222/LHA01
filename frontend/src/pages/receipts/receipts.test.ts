import { describe, expect, it } from 'vitest'
import { checkField } from '@/standard'
import {
  COLUMNS,
  FORM_RULES,
  MSG_ALLOC_POSITIVE,
  MSG_AMOUNT_POSITIVE,
  MSG_DUP_ROW,
  MSG_OVER_AMOUNT,
  MSG_OVER_OUTSTANDING,
  allocationSummary,
  applySuggestion,
  emptyAllocation,
  emptyFilters,
  emptyForm,
  ensureBlankRow,
  filtersActive,
  fmt,
  fromDoc,
  groupTree,
  statCards,
  suggestAllocation,
  toFrappeFilters,
  toPayload,
  validateAllocations,
  type AllocationForm,
  type ReceivableSchedule,
} from './receipts'

const row = (schedule: string, amount: number | null, outstanding = 100): AllocationForm => ({
  ...emptyAllocation(),
  schedule,
  allocated_amount: amount,
  outstanding,
})

const SCHEDULES: ReceivableSchedule[] = [
  { name: 'DT-2', schedule_name: 'Quý 1/2027', due_date: '2027-01-16', outstanding: 15_000_000, invoice: 'HDN-1' },
  { name: 'DT-1', schedule_name: 'Tạm ứng', due_date: '2027-01-15', outstanding: 33_000_000, invoice: 'HDN-1' },
  { name: 'DT-3', schedule_name: 'Nghiệm thu', due_date: '2027-06-30', outstanding: 77_000_000, invoice: null },
]

describe('cột, nhóm, bộ lọc', () => {
  it('cột đúng thứ tự, ghim và cộng ở Tổng', () => {
    expect(COLUMNS.map((c) => c.label)).toEqual([
      'STT', 'Số phiếu', 'Khách hàng', 'Ngày thu', 'Hình thức', 'Số tiền (VND)', 'Đã phân bổ (VND)', 'Chưa phân bổ (VND)', 'Thao tác',
    ])
    expect(COLUMNS.filter((c) => c.pin === 'left').map((c) => c.key)).toEqual(['_index', 'name'])
    expect(COLUMNS.at(-1)?.pin).toBe('right')
    expect(COLUMNS.filter((c) => c.sum).map((c) => c.key)).toEqual(['amount', 'allocated_total', 'unallocated_amount'])
    expect(COLUMNS.every((c) => c.width > 0)).toBe(true)
  })

  it('groupTree theo hình thức', () => {
    const tree = groupTree([{ method: 'Tiền mặt' }, { method: 'Tiền mặt' }, { method: 'Chuyển khoản' }])
    expect(tree[0].count).toBe(3)
    expect(tree[0].children?.map((c) => [c.key, c.count])).toEqual([['Chuyển khoản', 1], ['Tiền mặt', 2]])
  })

  it('bộ lọc gửi server', () => {
    expect(toFrappeFilters(emptyFilters())).toEqual({})
    expect(filtersActive(emptyFilters())).toBe(false)
    const f = { ...emptyFilters(), groups: ['Tiền mặt'], customer: 'KH-1', dateFrom: '2027-01-01', dateTo: '2027-01-31' }
    expect(toFrappeFilters(f)).toEqual({
      method: ['in', ['Tiền mặt']],
      customer: 'KH-1',
      receipt_date: ['between', ['2027-01-01', '2027-01-31']],
    })
    expect(filtersActive(f)).toBe(true)
    expect(toFrappeFilters({ ...emptyFilters(), dateFrom: '2027-01-01' }).receipt_date).toEqual(['>=', '2027-01-01'])
    expect(toFrappeFilters({ ...emptyFilters(), dateTo: '2027-01-31' }).receipt_date).toEqual(['<=', '2027-01-31'])
    expect(toFrappeFilters({ ...emptyFilters(), groups: [] }).name).toEqual(['in', []])
  })

  it('thẻ số liệu', () => {
    const cards = statCards([
      { amount: 40_000_000, unallocated_amount: 0 },
      { amount: 5_000_000, unallocated_amount: 2_000_000 },
    ])
    expect(cards.map((c) => [c.label, c.value])).toEqual([
      ['Số phiếu', 2],
      ['Tổng thu (VND)', '45.000.000'],
      ['Chưa phân bổ (VND)', '2.000.000'],
    ])
  })
})

describe('kiểm tra form', () => {
  it('trường bắt buộc và số tiền > 0', () => {
    const form = emptyForm()
    expect(checkField(FORM_RULES.customer!, '', form)).toBe('Vui lòng nhập khách hàng.')
    expect(checkField(FORM_RULES.receipt_date!, '', form)).toBe('Vui lòng nhập ngày thu.')
    expect(checkField(FORM_RULES.amount!, null, form)).toBe('Vui lòng nhập số tiền.')
    expect(checkField(FORM_RULES.amount!, 0, form)).toBe(MSG_AMOUNT_POSITIVE)
    expect(checkField(FORM_RULES.amount!, -1, form)).toBe(MSG_AMOUNT_POSITIVE)
    expect(checkField(FORM_RULES.amount!, 1, form)).toBeNull()
    expect(checkField(FORM_RULES.method!, '', form)).toBe('Vui lòng nhập hình thức.')
  })

  it('validateAllocations: hợp lệ và dòng trống bị bỏ qua', () => {
    expect(validateAllocations({ amount: 40_000_000, allocations: [row('DT-1', 33_000_000, 33_000_000), emptyAllocation()] })).toEqual({})
  })

  it('số phân bổ phải > 0', () => {
    const errors = validateAllocations({ amount: 10, allocations: [row('DT-1', 0), row('DT-2', null)] })
    expect(errors['allocations.0.allocated_amount']).toBe(fmt(MSG_ALLOC_POSITIVE, 1))
    expect(errors['allocations.1.allocated_amount']).toBe(fmt(MSG_ALLOC_POSITIVE, 2))
  })

  it('trùng đợt', () => {
    const errors = validateAllocations({ amount: 100, allocations: [row('DT-1', 10), row('DT-1', 10)] })
    expect(errors['allocations.1.schedule']).toBe(fmt(MSG_DUP_ROW, 2, 'DT-1'))
  })

  it('vượt còn nợ (theo bản đồ còn nợ hoặc theo dòng)', () => {
    const msg = fmt(MSG_OVER_OUTSTANDING, 1, '16.000.000', '15.000.000', 'DT-2')
    expect(validateAllocations({ amount: 99_000_000, allocations: [row('DT-2', 16_000_000)] }, { 'DT-2': 15_000_000 })['allocations.0.allocated_amount']).toBe(msg)
    expect(validateAllocations({ amount: 99_000_000, allocations: [row('DT-2', 16_000_000, 15_000_000)] })['allocations.0.allocated_amount']).toBe(msg)
  })

  it('tổng phân bổ vượt số tiền phiếu', () => {
    const errors = validateAllocations({ amount: 10_000_000, allocations: [row('DT-1', 6_000_000, 1e9), row('DT-2', 5_000_000, 1e9)] })
    expect(errors.allocations).toBe(fmt(MSG_OVER_AMOUNT, '11.000.000', '10.000.000'))
  })

  it('phân bổ ít hơn số tiền vẫn hợp lệ', () => {
    expect(validateAllocations({ amount: 20_000_000, allocations: [row('DT-2', 15_000_000, 15_000_000)] })).toEqual({})
  })
})

describe('tóm tắt phân bổ', () => {
  it('phần dư là Chưa phân bổ', () => {
    expect(allocationSummary({ amount: 20_000_000, allocations: [row('DT-2', 15_000_000), emptyAllocation()] })).toEqual({
      allocated: 15_000_000,
      unallocated: 5_000_000,
    })
    expect(allocationSummary({ amount: null, allocations: [emptyAllocation()] })).toEqual({ allocated: 0, unallocated: 0 })
  })
})

describe('gợi ý phân bổ', () => {
  it('40.000.000: Tạm ứng 33.000.000 rồi License 7.000.000', () => {
    const rows = suggestAllocation(SCHEDULES.slice(0, 2), 40_000_000)
    expect(rows.map((r) => [r.schedule, r.allocated_amount])).toEqual([['DT-1', 33_000_000], ['DT-2', 7_000_000]])
  })

  it('ưu tiên đợt của hóa đơn được chọn', () => {
    const rows = suggestAllocation(SCHEDULES, 80_000_000, null)
    expect(rows.map((r) => r.schedule)).toEqual(['DT-1', 'DT-2', 'DT-3'])
    const prefer = suggestAllocation([{ ...SCHEDULES[2], invoice: 'HDN-9' }, SCHEDULES[1]], 10, 'HDN-9')
    expect(prefer.map((r) => r.schedule)).toEqual(['DT-3'])
  })

  it('hết tiền thì dừng; bỏ đợt hết nợ; không có tiền thì rỗng', () => {
    expect(suggestAllocation(SCHEDULES, 10)).toHaveLength(1)
    expect(suggestAllocation([{ ...SCHEDULES[0], outstanding: 0 }], 10)).toEqual([])
    expect(suggestAllocation(SCHEDULES, 0)).toEqual([])
  })

  it('applySuggestion thay bảng và thêm dòng trống', () => {
    const form = emptyForm()
    applySuggestion(form, suggestAllocation(SCHEDULES.slice(0, 2), 40_000_000))
    expect(form.allocations).toHaveLength(3)
    expect(form.allocations[0]).toMatchObject({ schedule: 'DT-1', allocated_amount: 33_000_000, schedule_name: 'Tạm ứng', outstanding: 33_000_000 })
    expect(form.allocations[2].schedule).toBe('')
  })
})

describe('chuyển dữ liệu', () => {
  it('ensureBlankRow', () => {
    const rows = [row('DT-1', 1)]
    ensureBlankRow(rows)
    ensureBlankRow(rows)
    expect(rows).toHaveLength(2)
  })

  it('toPayload bỏ dòng trống, chỉ gửi đợt và số phân bổ', () => {
    const form = { ...emptyForm(), customer: 'KH-1', receipt_date: '2027-01-20', amount: 40_000_000, notes: '  ', allocations: [row('DT-1', 33_000_000), emptyAllocation()] }
    expect(toPayload(form)).toEqual({
      customer: 'KH-1',
      receipt_date: '2027-01-20',
      amount: 40_000_000,
      method: 'Chuyển khoản',
      notes: null,
      allocations: [{ schedule: 'DT-1', allocated_amount: 33_000_000 }],
    })
  })

  it('fromDoc thêm dòng trống', () => {
    const form = fromDoc({
      name: 'PT-1',
      customer: 'KH-1',
      receipt_date: '2027-01-20',
      amount: 40_000_000,
      method: 'Tiền mặt',
      allocations: [{ name: 'a', schedule: 'DT-1', allocated_amount: 33_000_000, schedule_name: 'Tạm ứng', outstanding_amount: 33_000_000 }],
    } as never)
    expect(form.allocations).toHaveLength(2)
    expect(form.method).toBe('Tiền mặt')
    expect(form.allocations[0].outstanding).toBe(33_000_000)
  })
})
