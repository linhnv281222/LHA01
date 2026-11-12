import { describe, expect, it } from 'vitest'
import {
  COLUMNS,
  FORM_RULES,
  INVOICE_STATUS,
  MSG_DUP_ROW,
  MSG_NO_ITEMS,
  MSG_OTHER_CUSTOMER,
  applySchedule,
  canCancelInvoice,
  computeTotals,
  emptyFilters,
  emptyForm,
  ensureBlankRow,
  filtersActive,
  fmt,
  fromDoc,
  groupTree,
  isLocked,
  mergeRequestRows,
  prefillItems,
  statCards,
  statusOf,
  toFrappeFilters,
  toPayload,
  validateItems,
  type ItemForm,
  type OpenSchedule,
} from './invoices'
import { checkField } from '@/standard'

const ADVANCE: OpenSchedule = { name: 'DT-1', schedule_name: 'Tạm ứng', contract: 'HD-1', due_date: '2027-01-15', amount_before_tax: 30_000_000, vat_rate: '10%', tax_amount: 3_000_000, total_amount: 33_000_000, customer: 'KH-1' }
const LICENSE: OpenSchedule = { name: 'DT-2', schedule_name: 'Quý 1/2027', contract: 'HD-1', due_date: '2027-01-16', amount_before_tax: 15_000_000, vat_rate: 'Không chịu thuế', tax_amount: 0, total_amount: 15_000_000, customer: 'KH-1' }

function rowOf(s: OpenSchedule): ItemForm {
  const item = emptyForm().items[0]
  applySchedule(item, s)
  return item
}

describe('cột bảng', () => {
  it('đúng thứ tự, ghim STT/Số hóa đơn trái và Thao tác phải', () => {
    expect(COLUMNS.map((c) => c.label)).toEqual([
      'STT', 'Số hóa đơn', 'Ký hiệu', 'Khách hàng', 'Ngày xuất', 'Trước thuế (VND)', 'Tiền thuế (VND)', 'Tổng cộng (VND)', 'Trạng thái', 'Thao tác',
    ])
    expect(COLUMNS.filter((c) => c.pin === 'left').map((c) => c.key)).toEqual(['_index', 'invoice_no'])
    expect(COLUMNS.find((c) => c.key === '_actions')?.pin).toBe('right')
    expect(COLUMNS.filter((c) => c.sum).map((c) => c.key)).toEqual(['total_before_tax', 'total_tax', 'grand_total'])
    expect(COLUMNS.every((c) => c.width > 0)).toBe(true)
  })
})

describe('trạng thái và cây nhóm', () => {
  it('statusOf: Hiệu lực xanh, Đã hủy xám có icon', () => {
    expect(statusOf({ status: 'Hiệu lực' })).toBe(INVOICE_STATUS['Hiệu lực'])
    expect(statusOf({ status: 'Đã hủy' })).toMatchObject({ tone: 'gray', icon: 'lucide-ban' })
    expect(statusOf({})).toBe(INVOICE_STATUS['Hiệu lực'])
  })
  it('groupTree đếm theo trạng thái', () => {
    const tree = groupTree([{ status: 'Hiệu lực' }, { status: 'Hiệu lực' }, { status: 'Đã hủy' }])
    expect(tree[0].count).toBe(3)
    expect(tree[0].children?.map((c) => [c.key, c.count])).toEqual([['Hiệu lực', 2], ['Đã hủy', 1]])
  })
  it('hủy được khi Hiệu lực; khóa khi Đã hủy', () => {
    expect(canCancelInvoice('Hiệu lực')).toBe(true)
    expect(canCancelInvoice('Đã hủy')).toBe(false)
    expect(isLocked('Đã hủy')).toBe(true)
    expect(isLocked('Hiệu lực')).toBe(false)
  })
})

describe('bộ lọc', () => {
  it('mặc định không lọc', () => {
    expect(toFrappeFilters(emptyFilters())).toEqual({})
    expect(filtersActive(emptyFilters())).toBe(false)
  })
  it('đổi sang filters Frappe', () => {
    const f = { ...emptyFilters(), groups: ['Hiệu lực'], customer: 'KH-1', dateFrom: '2027-01-01', dateTo: '2027-01-31', invoiceNo: ' 12 ' }
    expect(toFrappeFilters(f)).toEqual({
      status: ['in', ['Hiệu lực']],
      customer: 'KH-1',
      invoice_date: ['between', ['2027-01-01', '2027-01-31']],
      invoice_no: ['like', '%12%'],
    })
    expect(filtersActive(f)).toBe(true)
  })
  it('chỉ một đầu ngày; không chọn nhóm nào thì không ra dòng nào', () => {
    expect(toFrappeFilters({ ...emptyFilters(), dateFrom: '2027-01-01' }).invoice_date).toEqual(['>=', '2027-01-01'])
    expect(toFrappeFilters({ ...emptyFilters(), dateTo: '2027-01-31' }).invoice_date).toEqual(['<=', '2027-01-31'])
    expect(toFrappeFilters({ ...emptyFilters(), groups: [] }).name).toEqual(['in', []])
  })
})

describe('thẻ số liệu', () => {
  it('chỉ cộng tiền hóa đơn Hiệu lực', () => {
    const cards = statCards([
      { status: 'Hiệu lực', grand_total: 48_000_000 },
      { status: 'Hiệu lực', grand_total: 2_000_000 },
      { status: 'Đã hủy', grand_total: 9_000_000 },
    ])
    expect(cards.map((c) => [c.label, c.value])).toEqual([
      ['Số hóa đơn hiệu lực', 2],
      ['Tổng tiền (VND)', '50.000.000'],
      ['Đã hủy', 1],
    ])
  })
})

describe('kiểm tra form', () => {
  it('trường bắt buộc dùng câu chuẩn', () => {
    const form = emptyForm()
    expect(checkField(FORM_RULES.customer!, form.customer, form)).toBe('Vui lòng nhập khách hàng.')
    expect(checkField(FORM_RULES.invoice_no!, '', form)).toBe('Vui lòng nhập số hóa đơn.')
    expect(checkField(FORM_RULES.invoice_date!, '', form)).toBe('Vui lòng nhập ngày xuất.')
    expect(checkField(FORM_RULES.invoice_no!, 'HD1', form)).toBeNull()
  })

  it('cần ít nhất 1 đợt; dòng trống bị bỏ qua', () => {
    expect(validateItems({ customer: 'KH-1', items: [emptyForm().items[0]] })).toEqual({ items: MSG_NO_ITEMS })
  })

  it('đợt trùng trong hóa đơn', () => {
    const errors = validateItems({ customer: 'KH-1', items: [rowOf(ADVANCE), rowOf(ADVANCE), emptyForm().items[0]] })
    expect(errors['items.1.schedule']).toBe(fmt(MSG_DUP_ROW, 2, 'DT-1'))
    expect(errors['items.0.schedule']).toBeUndefined()
  })

  it('đợt của khách hàng khác', () => {
    const other = rowOf({ ...LICENSE, customer: 'KH-2' })
    const errors = validateItems({ customer: 'KH-1', items: [rowOf(ADVANCE), other] })
    expect(errors['items.1.schedule']).toBe(fmt(MSG_OTHER_CUSTOMER, 2, 'DT-2'))
  })

  it('hợp lệ thì không có lỗi', () => {
    expect(validateItems({ customer: 'KH-1', items: [rowOf(ADVANCE), rowOf(LICENSE)] })).toEqual({})
  })
})

describe('tính tổng', () => {
  it('48.000.000, theo thuế suất 10% và Không chịu thuế', () => {
    const t = computeTotals([rowOf(ADVANCE), rowOf(LICENSE), emptyForm().items[0]])
    expect(t.before).toBe(45_000_000)
    expect(t.tax).toBe(3_000_000)
    expect(t.total).toBe(48_000_000)
    expect(t.byTax).toEqual([
      { vat_rate: '10%', amount_before_tax: 30_000_000, tax_amount: 3_000_000, total_amount: 33_000_000 },
      { vat_rate: 'Không chịu thuế', amount_before_tax: 15_000_000, tax_amount: 0, total_amount: 15_000_000 },
    ])
  })
  it('gom các đợt cùng thuế suất; rỗng ra 0', () => {
    expect(computeTotals([rowOf(ADVANCE), rowOf({ ...ADVANCE, name: 'DT-3' })]).byTax).toHaveLength(1)
    expect(computeTotals([])).toEqual({ before: 0, tax: 0, total: 0, byTax: [] })
  })
})

describe('chuyển dữ liệu', () => {
  it('ensureBlankRow luôn có dòng trống ở cuối', () => {
    const items = [rowOf(ADVANCE)]
    ensureBlankRow(items)
    expect(items).toHaveLength(2)
    ensureBlankRow(items)
    expect(items).toHaveLength(2)
    const empty: ItemForm[] = []
    ensureBlankRow(empty)
    expect(empty).toHaveLength(1)
  })

  it('toPayload bỏ dòng trống, chỉ gửi mã đợt, chuỗi rỗng thành null', () => {
    const form = { ...emptyForm(), customer: 'KH-1', invoice_no: ' 0001 ', invoice_date: '2027-01-10', items: [rowOf(ADVANCE), emptyForm().items[0]] }
    expect(toPayload(form)).toEqual({
      customer: 'KH-1',
      invoice_no: '0001',
      invoice_series: null,
      invoice_date: '2027-01-10',
      notes: null,
      items: [{ schedule: 'DT-1' }],
    })
  })

  it('fromDoc thêm dòng trống cuối', () => {
    const form = fromDoc({
      name: 'HDN-1',
      customer: 'KH-1',
      invoice_no: '0001',
      invoice_date: '2027-01-10',
      items: [{ name: 'x', schedule: 'DT-1', schedule_name: 'Tạm ứng', total_amount: 33_000_000, vat_rate: '10%' }],
    } as never)
    expect(form.items).toHaveLength(2)
    expect(form.items[0].schedule).toBe('DT-1')
    expect(form.items[1].schedule).toBe('')
    expect(form.invoice_series).toBe('')
  })
})

describe('mergeRequestRows (lấy từ đề nghị thanh toán)', () => {
  it('thêm đợt chưa có, thay dòng trống, giữ 1 dòng trống cuối', () => {
    const items = [rowOf(ADVANCE), emptyForm().items[0]]
    const added = mergeRequestRows(items, [ADVANCE, LICENSE], 'KH-1')
    expect(added).toBe(1)
    expect(items.map((i) => i.schedule)).toEqual(['DT-1', 'DT-2', ''])
    expect(items[1].total_amount).toBe(15_000_000)
    expect(items[1].customer).toBe('KH-1')
  })
  it('không có đợt nào thì vẫn chỉ còn một dòng trống', () => {
    const items: ItemForm[] = []
    expect(mergeRequestRows(items, [], 'KH-1')).toBe(0)
    expect(items.map((i) => i.schedule)).toEqual([''])
  })
})

describe('prefillItems (mở từ Lịch thu tiền)', () => {
  const customers = { 'DT-1': 'KH-1', 'DT-2': 'KH-1', 'DT-3': 'KH-2', 'DT-4': 'KH-1' }
  it('điền đúng các đợt hợp lệ của khách hàng, kèm 1 dòng trống', () => {
    const { items, skipped } = prefillItems(['DT-1', 'DT-2'], customers, [ADVANCE, LICENSE], 'KH-1')
    expect(skipped).toEqual([])
    expect(items.map((i) => i.schedule)).toEqual(['DT-1', 'DT-2', ''])
    expect(items[0].total_amount).toBe(33_000_000)
    expect(items[0].customer).toBe('KH-1')
  })
  it('bỏ qua đợt không còn xuất được hoặc khác khách hàng', () => {
    const other = { ...ADVANCE, name: 'DT-3', customer: 'KH-2' }
    const { items, skipped } = prefillItems(['DT-1', 'DT-3', 'DT-4'], customers, [ADVANCE, other], 'KH-1')
    expect(items.map((i) => i.schedule)).toEqual(['DT-1', ''])
    expect(skipped).toEqual(['DT-3', 'DT-4'])
  })
  it('không đợt nào hợp lệ thì chỉ còn dòng trống', () => {
    const { items, skipped } = prefillItems(['DT-9'], {}, [], 'KH-1')
    expect(items).toHaveLength(1)
    expect(items[0].schedule).toBe('')
    expect(skipped).toEqual(['DT-9'])
  })
})
