import { describe, expect, it } from 'vitest'
import { cellText, checkField, computeTotals, formatCurrency } from '@/standard'
import type { Contract } from '@/types/doctypes'
import {
  COLUMNS,
  FORM_RULES,
  MSG_END_BEFORE_START,
  MSG_END_REQUIRED,
  MSG_NO_SCHEDULE,
  PERIODS,
  SCHEDULE_COLUMNS,
  SCHEDULE_DOCTYPE,
  STATUSES,
  acceptanceStatusOf,
  applyContractEndDate,
  invoiceStatusOf,
  overdueStatusOf,
  paymentStatusOf,
  periodText,
  recurringPeriods,
  requestStatusOf,
  scheduleTotals,
  showScheduleTable,
  statCards,
  type ScheduleRow,
  canActivate,
  canCancel,
  canLiquidate,
  emptyFilters,
  emptyForm,
  emptyItem,
  emptyMilestone,
  filtersActive,
  fromDoc,
  groupTree,
  isLocked,
  lockedMessage,
  milestoneSummary,
  onBillingTypeChange,
  statusOf,
  toFrappeFilters,
  toPayload,
  collectedPercent,
  detailFields,
  detailTitle,
  effectiveText,
  installmentText,
  isExpiringSoon,
  itemAfterTax,
  itemTotals,
  nextDueDate,
  nextDueText,
  normalizeGroups,
  overdueSummary,
  partyLines,
  periodBadge,
  asideCards,
  overdueScheduleFilters,
  usableSchedules,
  SCHEDULE_LIMIT,
  remainingText,
  type ContractItem,
  validateExtra,
  validateItems,
  type ContractForm,
  type ItemForm,
} from './contract'

function onceItem(over: Partial<ItemForm> = {}): ItemForm {
  return { ...emptyItem(), item_name: 'Đào tạo', vat_rate: '8%', amount: 5_000_000, due_date: '2027-02-01', ...over }
}
function multiItem(over: Partial<ItemForm> = {}): ItemForm {
  return {
    ...emptyItem(),
    item_key: 'K1',
    item_name: 'Triển khai',
    vat_rate: '10%',
    billing_type: 'Nhiều đợt',
    item_value: 100_000_000,
    milestone_input: 'Phần trăm',
    milestones: [
      { milestone_name: 'Tạm ứng', amount: null, percent: 30, due_date: '2027-01-15', requires_acceptance: true },
      { milestone_name: 'Nghiệm thu', amount: null, percent: 70, due_date: '2027-06-30', requires_acceptance: true },
    ],
    ...over,
  }
}
function recurringItem(over: Partial<ItemForm> = {}): ItemForm {
  return {
    ...emptyItem(),
    item_name: 'License',
    vat_rate: 'Không chịu thuế',
    billing_type: 'Định kỳ',
    requires_acceptance: false,
    unit_price: 15_000_000,
    period: 'Quý',
    period_start: '2027-01-01',
    period_end: '2027-12-31',
    ...over,
  }
}
function form(over: Partial<ContractForm> = {}): ContractForm {
  return {
    ...emptyForm(),
    contract_no: 'HD-001',
    customer: 'KH-001',
    start_date: '2027-01-01',
    end_date: '2027-12-31',
    items: [onceItem()],
    ...over,
  }
}

describe('FORM_RULES', () => {
  it('báo thiếu số hợp đồng, khách hàng, ngày bắt đầu', () => {
    for (const [key, text] of [
      ['contract_no', 'Vui lòng nhập số hợp đồng.'],
      ['customer', 'Vui lòng nhập khách hàng.'],
      ['start_date', 'Vui lòng nhập ngày bắt đầu hiệu lực.'],
    ] as const) {
      const f = form({ [key]: '' } as Partial<ContractForm>)
      expect(checkField(FORM_RULES[key]!, f[key], f)).toBe(text)
    }
  })

  it('hợp lệ thì không báo lỗi', () => {
    const f = form()
    for (const key of Object.keys(FORM_RULES) as (keyof ContractForm & string)[]) {
      expect(checkField(FORM_RULES[key]!, f[key], f)).toBeNull()
    }
  })

  it('ngày kết thúc trước ngày bắt đầu thì báo lỗi', () => {
    const f = form({ end_date: '2026-12-31' })
    expect(checkField(FORM_RULES.end_date!, f.end_date, f)).toBe(MSG_END_BEFORE_START)
  })

  it('ngày kết thúc bắt buộc khi có hạng mục Định kỳ', () => {
    expect(validateExtra(form({ end_date: '', items: [recurringItem()] })).end_date).toBe(MSG_END_REQUIRED)
    expect(validateExtra(form({ end_date: '', items: [onceItem()] })).end_date).toBeUndefined()
  })

  it('giới hạn độ dài', () => {
    const f = form({ contract_no: 'A'.repeat(141) })
    expect(checkField(FORM_RULES.contract_no!, f.contract_no, f)).toBe('Số hợp đồng tối đa 140 ký tự.')
  })
})

describe('validateItems', () => {
  it('hạng mục hợp lệ cả ba kiểu thì không lỗi', () => {
    expect(validateItems(form({ items: [onceItem(), multiItem(), recurringItem()] }))).toEqual({})
  })

  it('Một lần: thiếu tên, thuế suất, số tiền, ngày đến hạn', () => {
    const errors = validateItems(form({ items: [onceItem({ item_name: '', vat_rate: '', amount: null, due_date: '' })] }))
    expect(errors['items.0.item_name']).toBe('Hạng mục dòng 1: vui lòng nhập tên hạng mục.')
    expect(errors['items.0.vat_rate']).toBe('Hạng mục dòng 1: vui lòng nhập thuế suất.')
    expect(errors['items.0.amount']).toBe('Hạng mục dòng 1: vui lòng nhập số tiền trước thuế.')
    expect(errors['items.0.due_date']).toBe('Hạng mục dòng 1: vui lòng nhập ngày đến hạn.')
  })

  it('số tiền bằng 0 hoặc âm thì báo phải lớn hơn 0', () => {
    for (const amount of [0, -5]) {
      const errors = validateItems(form({ items: [onceItem({ amount })] }))
      expect(errors['items.0.amount']).toBe('Hạng mục dòng 1: số tiền trước thuế phải lớn hơn 0.')
    }
  })

  it('Nhiều đợt không có mốc', () => {
    const errors = validateItems(form({ items: [onceItem(), multiItem({ milestones: [] })] }))
    expect(errors['items.1.milestones']).toBe('Hạng mục dòng 2: cần ít nhất 1 mốc thanh toán.')
  })

  it('Nhiều đợt thiếu giá trị hạng mục', () => {
    const errors = validateItems(form({ items: [multiItem({ item_value: null })] }))
    expect(errors['items.0.item_value']).toBe('Hạng mục dòng 1: vui lòng nhập giá trị hạng mục trước thuế.')
  })

  it('mốc thiếu tên, ngày, phần trăm', () => {
    const item = multiItem()
    item.milestones[0] = { ...item.milestones[0], milestone_name: '', due_date: '', percent: null }
    const errors = validateItems(form({ items: [item] }))
    expect(errors['items.0.milestones.0.milestone_name']).toBe('Hạng mục dòng 1, mốc 1: vui lòng nhập tên mốc.')
    expect(errors['items.0.milestones.0.due_date']).toBe('Hạng mục dòng 1, mốc 1: vui lòng nhập ngày đến hạn.')
    expect(errors['items.0.milestones.0.percent']).toBe('Hạng mục dòng 1, mốc 1: vui lòng nhập phần trăm.')
  })

  it('tổng tiền các mốc lệch giá trị hạng mục thì báo độ lệch', () => {
    const item = multiItem({
      milestone_input: 'Số tiền',
      milestones: [
        { milestone_name: 'Đợt 1', amount: 30_000_000, percent: null, due_date: '2027-01-15', requires_acceptance: true },
        { milestone_name: 'Đợt 2', amount: 60_000_000, percent: null, due_date: '2027-02-15', requires_acceptance: true },
      ],
    })
    expect(validateItems(form({ items: [item] }))['items.0.milestones']).toBe(
      'Hạng mục "Triển khai": tổng các mốc là 90.000.000, giá trị hạng mục là 100.000.000, đang lệch -10.000.000.',
    )
  })

  it('tổng phần trăm lệch 100 thì báo độ lệch', () => {
    const item = multiItem()
    item.milestones[1].percent = 60
    expect(validateItems(form({ items: [item] }))['items.0.milestones']).toBe(
      'Hạng mục "Triển khai": tổng phần trăm các mốc là 90%, đang lệch -10%.',
    )
  })

  it('Định kỳ: thiếu đơn giá, chu kỳ, ngày bắt đầu kỳ đầu', () => {
    const errors = validateItems(form({ items: [recurringItem({ unit_price: null, period: '', period_start: '' })] }))
    expect(errors['items.0.unit_price']).toBe('Hạng mục dòng 1: vui lòng nhập đơn giá mỗi kỳ trước thuế.')
    expect(errors['items.0.period']).toBe('Hạng mục dòng 1: vui lòng nhập chu kỳ.')
    expect(errors['items.0.period_start']).toBe('Hạng mục dòng 1: vui lòng nhập ngày bắt đầu kỳ đầu.')
  })

  it('Định kỳ: ngày kết thúc kỳ trước ngày bắt đầu kỳ đầu', () => {
    const errors = validateItems(form({ items: [recurringItem({ period_end: '2026-12-01' })] }))
    expect(errors['items.0.period_end']).toBe(
      'Hạng mục dòng 1: ngày kết thúc kỳ phải từ ngày bắt đầu kỳ đầu trở đi.',
    )
  })

  it('Định kỳ: ngày kết thúc kỳ trống thì lấy theo hợp đồng khi so sánh', () => {
    expect(validateItems(form({ end_date: '2027-06-30', items: [recurringItem({ period_end: '' })] }))).toEqual({})
    const bad = validateItems(form({ end_date: '2026-06-30', items: [recurringItem({ period_end: '' })] }))
    expect(bad['items.0.period_end']).toBeDefined()
  })

  it('Định kỳ: số ngày được nợ âm hoặc lẻ', () => {
    for (const credit_days of [-1, 1.5]) {
      const errors = validateItems(form({ items: [recurringItem({ credit_days })] }))
      expect(errors['items.0.credit_days']).toBe(
        'Hạng mục dòng 1: số ngày được nợ phải là số nguyên từ 0 trở lên.',
      )
    }
    expect(validateItems(form({ items: [recurringItem({ credit_days: 0 })] }))).toEqual({})
  })

  it('trường của kiểu thu khác không bị kiểm', () => {
    const item = onceItem({ unit_price: null, period: '', item_value: null })
    expect(validateItems(form({ items: [item] }))).toEqual({})
  })
})

describe('milestoneSummary', () => {
  it('theo phần trăm: 30% + 70%', () => {
    const item = multiItem()
    expect(milestoneSummary(item, item.milestones)).toEqual({ total: 100, target: 100, diff: 0 })
  })
  it('theo số tiền: lệch so với giá trị hạng mục', () => {
    const item = multiItem({ milestone_input: 'Số tiền' })
    const ms = [{ ...emptyMilestone(item), amount: 30_000_000 }, { ...emptyMilestone(item), amount: 60_000_000 }]
    expect(milestoneSummary(item, ms)).toEqual({ total: 90_000_000, target: 100_000_000, diff: -10_000_000 })
  })
  it('không có mốc', () => {
    expect(milestoneSummary(multiItem(), [])).toEqual({ total: 0, target: 100, diff: -100 })
  })
})

describe('hành vi khi nhập', () => {
  it('đổi kiểu thu đặt lại Cần nghiệm thu và sửa tay vẫn giữ', () => {
    const item = onceItem()
    const f = form({ items: [item] })
    item.billing_type = 'Định kỳ'
    onBillingTypeChange(item, f)
    expect(item.requires_acceptance).toBe(false)
    item.requires_acceptance = true // sửa tay
    expect(item.requires_acceptance).toBe(true)
    item.billing_type = 'Nhiều đợt'
    onBillingTypeChange(item, f)
    expect(item.requires_acceptance).toBe(true)
    item.requires_acceptance = false
    item.billing_type = 'Một lần'
    onBillingTypeChange(item, f)
    expect(item.requires_acceptance).toBe(true)
  })

  it('sang Định kỳ thì ngày kết thúc kỳ lấy theo hợp đồng, không ghi đè giá trị đã có', () => {
    const f = form({ end_date: '2027-12-31' })
    const a = onceItem({ billing_type: 'Định kỳ' })
    onBillingTypeChange(a, f)
    expect(a.period_end).toBe('2027-12-31')
    const b = onceItem({ billing_type: 'Định kỳ', period_end: '2027-06-30' })
    onBillingTypeChange(b, f)
    expect(b.period_end).toBe('2027-06-30')
  })

  it('rời Nhiều đợt thì bỏ các mốc', () => {
    const item = multiItem({ billing_type: 'Một lần' })
    onBillingTypeChange(item, form())
    expect(item.milestones).toEqual([])
  })

  it('applyContractEndDate điền ngày kết thúc kỳ còn trống của hạng mục Định kỳ', () => {
    const f = form({ end_date: '2027-12-31', items: [recurringItem({ period_end: '' }), recurringItem({ period_end: '2027-06-30' }), onceItem()] })
    applyContractEndDate(f)
    expect(f.items[0].period_end).toBe('2027-12-31')
    expect(f.items[1].period_end).toBe('2027-06-30')
    expect(f.items[2].period_end).toBe('')
  })

  it('emptyForm luôn có sẵn 1 hạng mục; mốc mới lấy Cần nghiệm thu theo hạng mục', () => {
    expect(emptyForm().items).toHaveLength(1)
    expect(emptyMilestone({ requires_acceptance: false }).requires_acceptance).toBe(false)
    expect(emptyMilestone({ requires_acceptance: true }).requires_acceptance).toBe(true)
  })
})

describe('toPayload / fromDoc', () => {
  it('chuỗi rỗng gửi null, không gửi trạng thái và số tổng', () => {
    const p = toPayload(form({ contract_title: '  ', responsible_user: '', signed_date: '' }))
    expect(p.contract_title).toBeNull()
    expect(p.responsible_user).toBeNull()
    expect(p.signed_date).toBeNull()
    expect(p).not.toHaveProperty('status')
    expect(p).not.toHaveProperty('total_after_tax')
  })

  it('chỉ gửi trường của đúng kiểu thu', () => {
    const p = toPayload(form({ items: [onceItem({ unit_price: 1, period: 'Quý' }), recurringItem({ amount: 9 }), multiItem()] }))
    expect(p.items[0]).toHaveProperty('amount')
    expect(p.items[0]).not.toHaveProperty('unit_price')
    expect(p.items[1]).toHaveProperty('unit_price')
    expect(p.items[1]).not.toHaveProperty('amount')
    expect(p.items[2]).toHaveProperty('item_value')
    expect(p.items[2]).not.toHaveProperty('period')
  })

  it('mốc là mảng phẳng có item_key, theo cách nhập; mốc của kiểu khác bị bỏ', () => {
    const p = toPayload(form({ items: [multiItem(), onceItem({ milestones: multiItem().milestones })] }))
    expect(p.milestones).toHaveLength(2)
    expect(p.milestones[0]).toMatchObject({ item_key: 'K1', milestone_name: 'Tạm ứng', percent: 30, requires_acceptance: 1 })
    expect(p.milestones[0]).not.toHaveProperty('amount')
  })

  const doc: Contract = {
    name: 'HD-001',
    contract_no: 'HD-001',
    customer: 'KH-001',
    status: 'Nháp',
    start_date: '2027-01-01',
    end_date: '2027-12-31',
    total_after_tax: 175_400_000,
    items: [
      { name: 'a', item_key: 'K1', item_name: 'Triển khai', vat_rate: '10%', billing_type: 'Nhiều đợt', requires_acceptance: 1, item_value: 100_000_000, milestone_input: 'Phần trăm', amount: 0, unit_price: 0, credit_days: 0 },
      { name: 'b', item_key: 'K2', item_name: 'License', vat_rate: 'Không chịu thuế', billing_type: 'Định kỳ', requires_acceptance: 0, unit_price: 15_000_000, period: 'Quý', period_start: '2027-01-01', period_end: '2027-12-31', bill_timing: 'Đầu kỳ', credit_days: 0 },
    ],
    milestones: [
      { name: 'm1', item_key: 'K1', milestone_name: 'Tạm ứng', percent: 30, due_date: '2027-01-15', requires_acceptance: 1 },
      { name: 'm2', item_key: 'K1', milestone_name: 'Nghiệm thu', percent: 70, due_date: '2027-06-30', requires_acceptance: 1 },
      { name: 'm3', item_key: 'KHAC', milestone_name: 'Mồ côi', percent: 5, due_date: '2027-06-30', requires_acceptance: 1 },
    ],
  }

  it('fromDoc gom mốc về đúng hạng mục và bỏ mốc mồ côi', () => {
    const f = fromDoc(doc)
    expect(f.items).toHaveLength(2)
    expect(f.items[0].milestones.map((m) => m.milestone_name)).toEqual(['Tạm ứng', 'Nghiệm thu'])
    expect(f.items[1].milestones).toEqual([])
    expect(f.items[1].requires_acceptance).toBe(false)
  })

  it('đi rồi về giữ nguyên', () => {
    const once = fromDoc(doc)
    const back = fromDoc({ ...doc, ...(JSON.parse(JSON.stringify(toPayload(once))) as object) } as Contract)
    expect(back).toEqual(once)
  })

  it('doc chưa có hạng mục thì form có sẵn 1 dòng', () => {
    expect(fromDoc({ name: 'X', contract_no: 'X', customer: 'K', start_date: '2027-01-01' } as Contract).items).toHaveLength(1)
  })
})

describe('danh sách', () => {
  it('toFrappeFilters theo từng ô', () => {
    expect(toFrappeFilters(emptyFilters())).toEqual({})
    const f = { ...emptyFilters(), contractNo: ' 001 ', customer: 'KH-1', responsibleUser: 'a@x.com', contractType: 'DV' }
    expect(toFrappeFilters(f)).toEqual({
      contract_no: ['like', '%001%'],
      customer: 'KH-1',
      responsible_user: 'a@x.com',
      contract_type: 'DV',
    })
  })

  it('nhóm trạng thái: chọn một phần, không chọn nhóm nào', () => {
    expect(toFrappeFilters({ ...emptyFilters(), groups: ['Nháp', 'Đã hủy'] })).toEqual({ status: ['in', ['Nháp', 'Đã hủy']] })
    expect(toFrappeFilters({ ...emptyFilters(), groups: [] })).toEqual({ name: ['in', []] })
  })

  it('filtersActive', () => {
    expect(filtersActive(emptyFilters())).toBe(false)
    expect(filtersActive({ ...emptyFilters(), customer: 'KH-1' })).toBe(true)
    expect(filtersActive({ ...emptyFilters(), groups: ['Nháp'] })).toBe(true)
  })

  it('groupTree đếm theo trạng thái', () => {
    const tree = groupTree([{ status: 'Nháp' }, { status: 'Nháp' }, { status: 'Đang hiệu lực' }, { status: 'Đã hủy' }])
    expect(tree).toHaveLength(2)
    expect(tree[1].key).toBe('expiring')
    expect(tree[0].label).toBe('Tất cả hợp đồng')
    expect(tree[0].count).toBe(4)
    expect(tree[0].children?.map((c) => [c.key, c.count])).toEqual([
      ['Nháp', 2],
      ['Đang hiệu lực', 1],
      ['Hết hạn', 0],
      ['Đã thanh lý', 0],
      ['Đã hủy', 1],
    ])
  })

  it('cột: STT và số hợp đồng ghim trái, thao tác ghim phải, các cột tiền có dòng Tổng kể cả Đã thu và Còn phải thu', () => {
    const byKey = Object.fromEntries(COLUMNS.map((c) => [c.key, c]))
    expect(byKey._index.pin).toBe('left')
    expect(byKey.contract_no.pin).toBe('left')
    expect(byKey._actions.pin).toBe('right')
    expect(byKey.total_before_tax.sum).toBe(true)
    expect(byKey.total_after_tax.sum).toBe(true)
    expect(byKey.paid_amount.sum).toBe(true)
    expect(byKey.outstanding_amount.sum).toBe(true)
    expect(byKey.outstanding_amount.label).toBe('Còn phải thu (VND)')
  })

  it('dòng Tổng của cột Còn phải thu bằng tổng các dòng đang hiển thị', () => {
    const rows = [{ outstanding_amount: 100 }, { outstanding_amount: 250.5 }, { outstanding_amount: 0 }] as Contract[]
    expect(computeTotals(rows, COLUMNS).outstanding_amount).toBe(350.5)
  })

  it('thẻ số liệu: Đang hiệu lực, Tổng giá trị, Đã thu, Còn phải thu', () => {
    const rows = [
      { name: 'A', status: 'Đang hiệu lực', total_after_tax: 1000, paid_amount: 300, outstanding_amount: 700 },
      { name: 'B', status: 'Nháp', total_after_tax: 500, paid_amount: 0, outstanding_amount: 0 },
      { name: 'C', status: 'Đang hiệu lực', total_after_tax: 200, paid_amount: 200, outstanding_amount: 0 },
    ] as Contract[]
    const cards = statCards(rows)
    expect(cards.map((c) => c.label)).toEqual([
      'Đang hiệu lực',
      'Tổng giá trị sau thuế (VND)',
      'Đã thu (VND)',
      'Còn phải thu (VND)',
    ])
    expect(cards[0].value).toBe('2 / 3')
    expect(cards[0].status).toBeDefined()
    expect(cards[0].key).toBe('Đang hiệu lực')
    expect(cards[1].value).toBe(formatCurrency(1700))
    expect(cards[2].value).toBe(formatCurrency(500))
    expect(cards[3].value).toBe(formatCurrency(700))
  })
})

describe('trạng thái', () => {
  it('có StatusDef cho cả 5 trạng thái', () => {
    for (const s of STATUSES) expect(statusOf({ status: s })?.label).toBe(s)
  })

  it('canActivate, canCancel, canLiquidate, isLocked', () => {
    const table: Record<string, [boolean, boolean, boolean, boolean]> = {
      'Nháp': [true, true, false, false],
      'Đang hiệu lực': [false, true, true, false],
      'Hết hạn': [false, false, false, true],
      'Đã thanh lý': [false, false, false, true],
      'Đã hủy': [false, false, false, true],
    }
    for (const [status, expected] of Object.entries(table)) {
      expect([canActivate(status), canCancel(status), canLiquidate(status), isLocked(status)], status).toEqual(expected)
    }
  })

  it('lockedMessage', () => {
    expect(lockedMessage('Đã hủy')).toBe('Hợp đồng đã hủy, không sửa được.')
    expect(lockedMessage('Đã thanh lý')).toBe('Hợp đồng đã thanh lý, không sửa được.')
    expect(lockedMessage('Hết hạn')).toBe('Hợp đồng đã hết hạn, không sửa được.')
  })
})

describe('chu kỳ Ngày', () => {
  it('thiếu hoặc sai số ngày mỗi kỳ thì báo lỗi ở items.0.period_days', () => {
    for (const value of [null, 0, -3, 1.5]) {
      const errors = validateItems(form({ items: [recurringItem({ period: 'Ngày', period_days: value })] }))
      expect(errors['items.0.period_days'], String(value)).toContain('số ngày mỗi kỳ')
    }
    expect(validateItems(form({ items: [recurringItem({ period: 'Ngày', period_days: null })] }))['items.0.period_days']).toContain('vui lòng nhập')
    expect(validateItems(form({ items: [recurringItem({ period: 'Ngày', period_days: 0 })] }))['items.0.period_days']).toContain('phải lớn hơn 0')
  })

  it('số ngày hợp lệ thì không lỗi; chu kỳ khác bỏ qua ô này', () => {
    expect(validateItems(form({ items: [recurringItem({ period: 'Ngày', period_days: 15 })] }))).toEqual({})
    expect(validateItems(form({ items: [recurringItem({ period: 'Quý', period_days: 0 })] }))).toEqual({})
  })

  it('toPayload chỉ gửi period_days khi chu kỳ Ngày; fromDoc giữ lại', () => {
    expect(toPayload(form({ items: [recurringItem({ period: 'Ngày', period_days: 15 })] })).items[0].period_days).toBe(15)
    expect(toPayload(form({ items: [recurringItem({ period: 'Quý', period_days: 15 })] })).items[0].period_days).toBeNull()
    const back = fromDoc({
      name: 'X', contract_no: 'X', customer: 'K', start_date: '2027-01-01',
      items: [{ name: 'a', item_name: 'L', vat_rate: '8%', billing_type: 'Định kỳ', period: 'Ngày', period_days: 15 }],
    } as unknown as Contract)
    expect(back.items[0].period_days).toBe(15)
  })

  it('PERIODS có thêm Ngày, giữ các chu kỳ cũ', () => {
    expect(PERIODS).toEqual(['Tháng', 'Quý', '6 tháng', 'Năm', 'Ngày'])
  })
})

describe('recurringPeriods', () => {
  it('Ngày: 15 ngày/kỳ, kỳ cuối lẻ 11 ngày', () => {
    const p = recurringPeriods('Ngày', '2027-01-01', '2027-02-10', 15)
    expect(p.map((x) => [x.from, x.to])).toEqual([
      ['2027-01-01', '2027-01-15'],
      ['2027-01-16', '2027-01-30'],
      ['2027-01-31', '2027-02-10'],
    ])
    expect(p.map((x) => x.ratio)).toEqual([1, 1, 11 / 15])
  })

  it('Ngày: số ngày sai thì không có kỳ', () => {
    expect(recurringPeriods('Ngày', '2027-01-01', '2027-02-10', 0)).toEqual([])
    expect(recurringPeriods('Ngày', '2027-01-01', '2027-02-10', null)).toEqual([])
  })

  it('Quý: kỳ cuối lẻ khớp bản Python', () => {
    const p = recurringPeriods('Quý', '2027-01-01', '2027-05-15')
    expect(p).toHaveLength(2)
    expect(p[0]).toEqual({ from: '2027-01-01', to: '2027-03-31', ratio: 1 })
    expect(p[1].from).toBe('2027-04-01')
    expect(p[1].to).toBe('2027-05-15')
    expect(p[1].ratio).toBeCloseTo(45 / 91)
    expect(recurringPeriods('Quý', '2027-01-01', '2027-12-31')).toHaveLength(4)
    expect(recurringPeriods('Năm', '2027-01-01', '2027-12-31')).toHaveLength(1)
    expect(recurringPeriods('Tháng', '2027-01-31', '2027-03-31').map((x) => x.from)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
  })
})

describe('tab Lịch thu', () => {
  const rows: ScheduleRow[] = [
    { name: 'a', item_name: 'License', schedule_name: 'Quý 1/2027', period_from: '2027-01-01', period_to: '2027-03-31', due_date: '2027-01-16', amount_before_tax: 15_000_000, tax_amount: 0, total_amount: 15_000_000, requires_acceptance: 0 },
    { name: 'b', item_name: 'Triển khai', schedule_name: 'Tạm ứng', due_date: '2027-01-15', amount_before_tax: 30_000_000, tax_amount: 3_000_000, total_amount: 33_000_000, requires_acceptance: 1, acceptance_status: 'Chưa' },
  ]

  it('13 cột đúng thứ tự, nhãn và kiểu', () => {
    expect(SCHEDULE_COLUMNS.map((c) => c.label)).toEqual([
      'STT', 'Hạng mục', 'Tên đợt', 'Kỳ', 'Ngày đến hạn', 'Trước thuế (VND)', 'Tiền thuế (VND)', 'Tổng tiền (VND)',
      'Nghiệm thu', 'Đề nghị thanh toán', 'Hóa đơn', 'Thanh toán', 'Quá hạn',
    ])
    expect(SCHEDULE_COLUMNS.map((c) => c.type)).toEqual([
      'index', undefined, undefined, undefined, 'date', 'currency', 'currency', 'currency', 'status', 'status', 'status', 'status', 'status',
    ])
  })

  it('overdueStatusOf: Quá hạn đỏ có icon, ngược lại Không', () => {
    expect(overdueStatusOf({ name: 'x', is_overdue: 1 })).toEqual({ label: 'Quá hạn', icon: 'lucide-alarm-clock', tone: 'red' })
    expect(overdueStatusOf({ name: 'x', is_overdue: 0 }).label).toBe('Không')
    expect(overdueStatusOf({ name: 'x' }).tone).toBe('gray')
  })

  it('paymentStatusOf ghép số đã thu vào nhãn', () => {
    expect(paymentStatusOf({ name: 'x', payment_status: 'Thu một phần', paid_amount: 7_000_000 }).label).toBe('Thu một phần 7.000.000')
    expect(paymentStatusOf({ name: 'x', payment_status: 'Chưa thu', paid_amount: 0 }).label).toBe('Chưa thu')
  })

  it('cột ngày và tiền hiển thị DD/MM/YYYY và 1.234.567', () => {
    const byKey = Object.fromEntries(SCHEDULE_COLUMNS.map((c) => [c.key, c]))
    expect(cellText(byKey.due_date, rows[0])).toBe('16/01/2027')
    expect(cellText(byKey.total_amount, rows[1])).toBe('33.000.000')
  })

  it('periodText rỗng khi không định kỳ', () => {
    expect(periodText(rows[0])).toBe('01/01/2027 - 31/03/2027')
    expect(periodText(rows[1])).toBe('')
  })

  it('trạng thái hiển thị', () => {
    expect(acceptanceStatusOf(rows[0]).label).toBe('Không cần')
    expect(acceptanceStatusOf(rows[1])).toMatchObject({ tone: 'amber' })
    expect(acceptanceStatusOf({ name: 'x', requires_acceptance: 1, acceptance_status: 'Đã ký' }).tone).toBe('green')
    expect(acceptanceStatusOf({ name: 'x', requires_acceptance: 0, acceptance_status: 'Đã ký' }).label).toBe('Không cần')
    expect(requestStatusOf({ name: 'x' }).label).toBe('Chưa lập')
    expect(requestStatusOf({ name: 'x', request_status: 'Đã lập' }).tone).toBe('blue')
    expect(invoiceStatusOf({ name: 'x' }).label).toBe('Chưa xuất')
    expect(invoiceStatusOf({ name: 'x', invoice_status: 'Đã xuất', invoice_no: 'AB-01' }).label).toBe('Đã xuất AB-01')
    expect(paymentStatusOf({ name: 'x' }).label).toBe('Chưa thu')
    expect(paymentStatusOf({ name: 'x', payment_status: 'Thu một phần' }).tone).toBe('amber')
    expect(paymentStatusOf({ name: 'x', payment_status: 'Đã thu' }).tone).toBe('green')
  })

  it('scheduleTotals cộng ba cột; mảng rỗng ra 0', () => {
    expect(scheduleTotals(rows)).toEqual({ before: 45_000_000, tax: 3_000_000, total: 48_000_000 })
    expect(scheduleTotals([])).toEqual({ before: 0, tax: 0, total: 0 })
  })

  it('hợp đồng Nháp hiện hướng dẫn thay cho bảng', () => {
    expect(MSG_NO_SCHEDULE).toBe('Chưa có lịch thu. Bấm Kích hoạt để sinh các đợt thu.')
    expect(showScheduleTable('Nháp')).toBe(false)
    expect(showScheduleTable('Đang hiệu lực')).toBe(true)
    expect(SCHEDULE_DOCTYPE).toBe('Payment Schedule')
  })
})

describe('danh sách hợp đồng (ticket A)', () => {
  const TODAY = '2026-11-12'
  const sch = (contract: string, due: string, total: number, paid: number, item_key = 'K1') => ({
    contract,
    due_date: due,
    total_amount: total,
    paid_amount: paid,
    item_key,
  })

  it('cột mặc định đúng thứ tự, ghim, không cuộn ngang', () => {
    const shown = COLUMNS.filter((c) => !c.hidden)
    expect(shown.map((c) => c.label)).toEqual([
      'STT',
      'Số hợp đồng',
      'Khách hàng / Nội dung',
      'Trạng thái',
      'Hiệu lực',
      'Tổng sau thuế (VND)',
      'Đã thu (VND)',
      'Còn phải thu (VND)',
      'Phụ trách',
      'Thao tác',
    ])
    expect(shown[0].pin).toBe('left')
    expect(shown[1].pin).toBe('left')
    expect(shown[shown.length - 1].pin).toBe('right')
    expect(shown.reduce((a, c) => a + c.width, 0)).toBeLessThanOrEqual(1320)
  })

  it('ba cột ẩn mặc định; ba cột tiền và Giá trị trước thuế được cộng', () => {
    const hidden = COLUMNS.filter((c) => c.hidden).map((c) => c.label)
    expect(hidden.sort()).toEqual(['Giá trị trước thuế (VND)', 'Loại hợp đồng', 'Ngày ký'].sort())
    const rows = [1, 2, 3, 4, 5].map((n) => ({
      total_before_tax: n * 100,
      total_after_tax: n * 110,
      paid_amount: n * 10,
      outstanding_amount: n * 100,
    })) as Contract[]
    const totals = computeTotals(rows, COLUMNS)
    expect(totals.total_before_tax).toBe(1500)
    expect(totals.total_after_tax).toBe(1650)
    expect(totals.paid_amount).toBe(150)
    expect(totals.outstanding_amount).toBe(1500)
  })

  it('partyLines: chưa có tên hợp đồng thì "Chưa có nội dung"', () => {
    expect(partyLines({ customer_name: 'Công ty A', contract_title: '' })).toEqual({ top: 'Công ty A', bottom: 'Chưa có nội dung' })
    expect(partyLines({ customer_name: 'Công ty A', contract_title: null }).bottom).toBe('Chưa có nội dung')
    expect(partyLines({ customer_name: 'A', contract_title: 'Bảo trì' }).bottom).toBe('Bảo trì')
  })

  it('số ngày còn lại', () => {
    expect(remainingText('2026-11-22', TODAY)).toBe('còn 10 ngày')
    expect(remainingText('2026-11-09', TODAY)).toBe('đã hết hạn 3 ngày')
    expect(remainingText(null, TODAY)).toBe('chưa đặt')
    expect(remainingText(TODAY, TODAY)).toBe('còn 0 ngày')
  })

  it('effectiveText', () => {
    expect(effectiveText({ start_date: '2026-01-05', end_date: '2026-12-31' })).toBe('05/01/2026 – 31/12/2026')
    expect(effectiveText({ start_date: '2026-01-05', end_date: null })).toBe('Từ 05/01/2026')
    expect(effectiveText({ start_date: null, end_date: null })).toBe('Không có')
  })

  it('tỷ lệ đã thu', () => {
    expect(collectedPercent(250_000, 1_000_000)).toBe(25)
    expect(collectedPercent(100, 0)).toBe(0)
    expect(collectedPercent(2_000, 1_000)).toBe(100)
    expect(collectedPercent(1, 3)).toBe(33)
  })

  it('sắp hết hạn: gồm hai đầu', () => {
    const r = (status: string, end: string | null) => ({ status, end_date: end })
    expect(isExpiringSoon(r('Đang hiệu lực', '2026-11-12'), TODAY)).toBe(true)
    expect(isExpiringSoon(r('Đang hiệu lực', '2026-12-12'), TODAY)).toBe(true)
    expect(isExpiringSoon(r('Đang hiệu lực', '2026-12-13'), TODAY)).toBe(false)
    expect(isExpiringSoon(r('Đang hiệu lực', '2026-11-11'), TODAY)).toBe(false)
    expect(isExpiringSoon(r('Hết hạn', '2026-11-20'), TODAY)).toBe(false)
    expect(isExpiringSoon(r('Đang hiệu lực', null), TODAY)).toBe(false)
  })

  it('thẻ: 3 / 5 và hết hạn trong 30 ngày; tone và đợt quá hạn', () => {
    const rows = [
      { name: 'A', status: 'Đang hiệu lực', end_date: '2026-11-27', total_after_tax: 1_000_000, paid_amount: 250_000, outstanding_amount: 750_000 },
      { name: 'B', status: 'Đang hiệu lực', end_date: '2027-06-01', total_after_tax: 0, paid_amount: 0, outstanding_amount: 0 },
      { name: 'C', status: 'Đang hiệu lực', end_date: null, total_after_tax: 0, paid_amount: 0, outstanding_amount: 0 },
      { name: 'D', status: 'Nháp', end_date: null, total_after_tax: 0, paid_amount: 0, outstanding_amount: 0 },
      { name: 'E', status: 'Đã hủy', end_date: null, total_after_tax: 0, paid_amount: 0, outstanding_amount: 0 },
    ] as Contract[]
    const schedules = [
      sch('A', '2026-11-01', 500_000, 200_000),
      sch('B', '2026-10-01', 300_000, 100_000),
      sch('A', '2026-12-01', 100_000, 0),
      sch('A', '2026-10-01', 100_000, 100_000),
      sch('D', '2026-09-01', 999, 0),
      sch('E', '2026-09-01', 999, 0),
    ]
    const cards = statCards(rows, schedules, TODAY)
    expect(cards[0].value).toBe('3 / 5')
    expect(cards[0].hint).toBe('1 hợp đồng hết hạn trong 30 ngày')
    expect(cards[2].tone).toBe('green')
    expect(cards[2].progress).toBe(25)
    expect(cards[3].tone).toBe('amber')
    expect(cards[3].hint).toBe(`2 đợt quá hạn · ${formatCurrency(500_000)}`)
    // Lịch thu lỗi: chỉ thẻ phụ thuộc lịch thu hiện "Không có".
    const failed = statCards(rows, null, TODAY)
    expect(failed[3].hint).toBe('Không có')
    expect(failed[0].value).toBe('3 / 5')
  })

  it('overdueSummary bỏ đợt Nháp, Đã hủy và hợp đồng ngoài tập đang tải', () => {
    const s = [
      sch('A', '2026-11-01', 500_000, 200_000),
      sch('N', '2026-11-01', 300_000, 0),
      sch('H', '2026-11-01', 300_000, 0),
      sch('X', '2026-11-01', 300_000, 0),
    ]
    expect(overdueSummary(s, { A: 'Đang hiệu lực', N: 'Nháp', H: 'Đã hủy' }, TODAY)).toEqual({ count: 1, amount: 300_000 })
  })

  it('nextDueDate chọn ngày nhỏ nhất từ hôm nay trong đợt chưa thu đủ', () => {
    const s = [
      sch('A', '2026-11-01', 100, 0),
      sch('A', '2026-12-20', 100, 0),
      sch('A', '2026-11-12', 100, 100),
      sch('A', '2026-11-30', 100, 40),
    ]
    expect(nextDueDate(s, TODAY)).toBe('2026-11-30')
    expect(nextDueDate([sch('A', '2026-11-01', 100, 0)], TODAY)).toBeNull()
    expect(nextDueText(null)).toBe('Không có')
    expect(nextDueText('2026-11-30')).toBe('30/11/2026')
  })

  it('nút Sắp hết hạn: bộ lọc, normalizeGroups, cây nhóm', () => {
    const f = { ...emptyFilters(), groups: ['expiring'] }
    expect(toFrappeFilters(f, TODAY)).toEqual({ status: 'Đang hiệu lực', end_date: ['between', ['2026-11-12', '2026-12-12']] })
    expect(filtersActive(f)).toBe(true)
    expect(normalizeGroups(['Nháp', 'Hết hạn', 'expiring'], ['Nháp', 'Hết hạn'])).toEqual(['expiring'])
    expect(normalizeGroups(['expiring', 'Nháp'], ['expiring'])).toEqual(['Nháp'])
    expect(normalizeGroups(['Nháp'], ['Nháp', 'Hết hạn'])).toEqual(['Nháp'])
    const tree = groupTree(
      [
        { status: 'Đang hiệu lực', end_date: '2026-11-20' },
        { status: 'Đang hiệu lực', end_date: '2027-01-01' },
        { status: 'Nháp', end_date: '2026-11-20' },
      ],
      TODAY,
    )
    expect(tree[0].count).toBe(3)
    expect(tree[1]).toMatchObject({ key: 'expiring', label: 'Sắp hết hạn', count: 1 })
  })

  it('ô "Chỉ hợp đồng còn phải thu"', () => {
    expect(emptyFilters().onlyOutstanding).toBe(false)
    expect(toFrappeFilters({ ...emptyFilters(), onlyOutstanding: true }, TODAY)).toEqual({ outstanding_amount: ['>', 0] })
    expect(filtersActive({ ...emptyFilters(), onlyOutstanding: true })).toBe(true)
  })

  it('chi tiết: tiêu đề, trường trống, không có "—"', () => {
    expect(detailTitle({ contract_no: 'HD-01', customer_name: 'Công ty A' })).toBe('HD-01 · Công ty A')
    expect(detailTitle({ contract_no: 'HD-01', customer_name: null })).toBe('HD-01')
    const fields = detailFields({ contract_no: 'HD-01', customer_name: 'Công ty A', start_date: '2026-01-01' } as Contract)
    const byLabel = Object.fromEntries(fields.map((f) => [f.label, f.value]))
    expect(byLabel['Tên hợp đồng']).toBe('')
    expect(byLabel['Ngày ký']).toBe('')
    expect(byLabel['Thời hạn còn lại']).toBe('')
    expect(byLabel['Ngày bắt đầu']).toBe('01/01/2026')
    expect(JSON.stringify(fields)).not.toContain('—')
    expect(detailTitle({ contract_no: 'A', customer_name: 'B' })).not.toContain('—')
  })

  it('hạng mục: nhãn kỳ, đợt thu, tổng', () => {
    const quarterly = { billing_type: 'Định kỳ', period: 'Quý', period_start: '2026-01-01', period_end: '2026-12-31' } as ContractItem
    expect(periodBadge(quarterly, null)).toBe('Hàng quý · 4 kỳ')
    expect(periodBadge({ ...quarterly, period_end: null } as ContractItem, '2026-12-31')).toBe('Hàng quý · 4 kỳ')
    expect(periodBadge({ billing_type: 'Một lần' } as ContractItem, null)).toBeNull()
    const four = [sch('A', '2026-01-01', 100, 100), sch('A', '2026-04-01', 100, 0), sch('A', '2026-07-01', 100, 0), sch('A', '2026-10-01', 100, 50)]
    expect(installmentText('K1', four)).toBe('đã thu 1/4')
    expect(installmentText('K9', four)).toBe('Không có')
    expect(installmentText('K1', null)).toBe('Không có')
    const items = [
      { amount_before_tax: 1000, tax_amount: 100 },
      { amount_before_tax: 2000, tax_amount: 0 },
    ] as ContractItem[]
    expect(itemAfterTax(items[0])).toBe(1100)
    expect(itemTotals(items)).toEqual({ before: 3000, tax: 100, after: 3100 })
  })
})

describe('Contract list: lịch thu, thẻ chi tiết, nhãn kỳ thiếu ngày', () => {
  it('usableSchedules: lỗi, đang tải hoặc chạm giới hạn thì null', () => {
    const data = [1, 2, 3]
    expect(usableSchedules(data, false, false)).toEqual(data)
    expect(usableSchedules(data, true, false)).toBeNull()
    expect(usableSchedules(data, false, true)).toBeNull()
    expect(usableSchedules(undefined, false, false)).toBeNull()
    expect(usableSchedules(new Array(SCHEDULE_LIMIT).fill(0), false, false)).toBeNull()
    expect(usableSchedules(new Array(SCHEDULE_LIMIT - 1).fill(0), false, false)).toHaveLength(SCHEDULE_LIMIT - 1)
    expect(usableSchedules(data, false, false, 3)).toBeNull()
  })

  it('overdueScheduleFilters lọc ở server theo hạn và trạng thái, không dùng IN', () => {
    expect(overdueScheduleFilters('2026-11-12')).toEqual({ due_date: ['<', '2026-11-12'], payment_status: ['!=', 'Đã thu'] })
  })

  it('asideCards: 3 thẻ tiền cho dòng chọn', () => {
    const cards = asideCards(
      { total_after_tax: 1_000_000, total_tax: 90_909, paid_amount: 250_000, outstanding_amount: 750_000 },
      '15/12/2026',
    )
    expect(cards.map((c) => c.key)).toEqual(['total', 'paid', 'outstanding'])
    expect(cards[0].hint).toBe(`Tiền thuế: ${formatCurrency(90_909)}`)
    expect(cards[1].tone).toBe('green')
    expect(cards[1].progress).toBe(25)
    expect(cards[2].tone).toBe('amber')
    expect(cards[2].value).toBe(formatCurrency(750_000))
    expect(cards[2].hint).toBe('Đến hạn đợt kế tiếp: 15/12/2026')
  })

  it('periodBadge trả null khi thiếu ngày hoặc không có kỳ nào', () => {
    const q = { billing_type: 'Định kỳ', period: 'Quý', period_start: '2026-01-01', period_end: '2026-12-31' } as ContractItem
    expect(periodBadge({ ...q, period_start: null } as ContractItem, '2026-12-31')).toBeNull()
    expect(periodBadge({ ...q, period_end: null } as ContractItem, null)).toBeNull()
    expect(periodBadge({ ...q, period_start: '2026-12-31', period_end: '2026-01-01' } as ContractItem, null)).toBeNull()
  })
})
