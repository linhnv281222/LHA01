import { describe, expect, it } from 'vitest'
import {
  COLUMNS,
  ITEM_COLUMNS,
  MSG_DUE_BEFORE_REQUEST,
  MSG_DUP_ROW,
  MSG_FULLY_PAID,
  MSG_NO_ITEMS,
  MSG_OTHER_CUSTOMER,
  REQUEST_STATUS,
  applySchedule,
  canDelete,
  canMarkSent,
  emptyFilters,
  emptyForm,
  ensureBlankRow,
  filtersActive,
  formTotals,
  fromDoc,
  groupTree,
  isLocked,
  prefillFromSchedules,
  printUrl,
  statCards,
  statusOf,
  toFrappeFilters,
  toPayload,
  validateForm,
  type ItemForm,
  type PaymentRequest,
  type RequestableSchedule,
  type RequestForm,
} from './paymentRequest'

const ADVANCE: RequestableSchedule = { name: 'DT-1', schedule_name: 'Tạm ứng', contract: 'HD-1', due_date: '2027-01-15', amount_before_tax: 30_000_000, vat_rate: '10%', tax_amount: 3_000_000, total_amount: 33_000_000, outstanding: 33_000_000, customer: 'KH-1' }
const LICENSE: RequestableSchedule = { name: 'DT-2', schedule_name: 'Quý 1/2027', contract: 'HD-1', due_date: '2027-01-16', amount_before_tax: 15_000_000, vat_rate: 'Không chịu thuế', tax_amount: 0, total_amount: 15_000_000, outstanding: 15_000_000, customer: 'KH-1' }

function rowOf(s: RequestableSchedule): ItemForm {
  const item = emptyForm().items[0]
  applySchedule(item, s)
  return item
}

function validForm(): RequestForm {
  const form = emptyForm('2027-01-10')
  form.customer = 'KH-1'
  form.due_date = '2027-01-25'
  form.items = [rowOf(ADVANCE), rowOf(LICENSE)]
  ensureBlankRow(form.items)
  return form
}

describe('cột bảng', () => {
  it('ghim STT và Số đề nghị bên trái, Thao tác bên phải, ba cột tiền có dòng Tổng', () => {
    expect(COLUMNS.map((c) => c.key)).toEqual([
      '_index', 'name', 'customer_name', 'request_date', 'due_date',
      'total_before_tax', 'total_tax', 'grand_total', 'status', '_actions',
    ])
    expect(COLUMNS.filter((c) => c.pin === 'left').map((c) => c.key)).toEqual(['_index', 'name'])
    expect(COLUMNS.find((c) => c.key === '_actions')?.pin).toBe('right')
    expect(COLUMNS.filter((c) => c.sum).map((c) => c.key)).toEqual(['total_before_tax', 'total_tax', 'grand_total'])
    expect(COLUMNS.every((c) => c.width)).toBe(true)
  })
  it('bảng dòng có cột Còn nợ', () => {
    expect(ITEM_COLUMNS.map((c) => c.label)).toContain('Còn nợ (VND)')
  })
})

describe('trạng thái', () => {
  it('Nháp xám, Đã gửi xanh, mặc định Nháp', () => {
    expect(REQUEST_STATUS['Nháp'].tone).toBe('gray')
    expect(REQUEST_STATUS['Đã gửi'].tone).toBe('green')
    expect(statusOf({ status: 'Đã gửi' }).label).toBe('Đã gửi')
    expect(statusOf({}).label).toBe('Nháp')
  })
  it('chỉ Nháp mới đánh dấu đã gửi và xóa được; Đã gửi khóa sửa', () => {
    expect(canMarkSent('Nháp')).toBe(true)
    expect(canMarkSent('Đã gửi')).toBe(false)
    expect(canDelete('Nháp')).toBe(true)
    expect(canDelete('Đã gửi')).toBe(false)
    expect(isLocked('Đã gửi')).toBe(true)
    expect(isLocked('Nháp')).toBe(false)
  })
  it('groupTree đếm theo trạng thái', () => {
    const tree = groupTree([{ status: 'Nháp' }, { status: 'Nháp' }, { status: 'Đã gửi' }])
    expect(tree[0].label).toBe('Tất cả đề nghị')
    expect(tree[0].count).toBe(3)
    expect(tree[0].children?.map((c) => [c.key, c.count])).toEqual([['Nháp', 2], ['Đã gửi', 1]])
  })
})

describe('bộ lọc', () => {
  it('mặc định không lọc', () => {
    expect(toFrappeFilters(emptyFilters())).toEqual({})
    expect(filtersActive(emptyFilters())).toBe(false)
  })
  it('đổi sang filters Frappe', () => {
    const f = { ...emptyFilters(), groups: ['Nháp'], customer: 'KH-1', dateFrom: '2027-01-01', dateTo: '2027-01-31', requestNo: ' 0001 ' }
    expect(toFrappeFilters(f)).toEqual({
      status: ['in', ['Nháp']],
      customer: 'KH-1',
      request_date: ['between', ['2027-01-01', '2027-01-31']],
      name: ['like', '%0001%'],
    })
    expect(filtersActive(f)).toBe(true)
  })
  it('chỉ một đầu ngày; không chọn nhóm nào thì không ra dòng nào', () => {
    expect(toFrappeFilters({ ...emptyFilters(), dateFrom: '2027-01-01' }).request_date).toEqual(['>=', '2027-01-01'])
    expect(toFrappeFilters({ ...emptyFilters(), dateTo: '2027-01-31' }).request_date).toEqual(['<=', '2027-01-31'])
    expect(toFrappeFilters({ ...emptyFilters(), groups: [] })).toEqual({ name: ['in', []] })
    // Nhập Số đề nghị cũng không làm mất điều kiện rỗng.
    expect(toFrappeFilters({ ...emptyFilters(), groups: [], requestNo: '0001' })).toEqual({ name: ['in', []] })
  })
})

describe('thẻ số liệu', () => {
  it('đếm Nháp, Đã gửi và cộng tổng tiền', () => {
    const cards = statCards([
      { status: 'Nháp', grand_total: 10 },
      { status: 'Đã gửi', grand_total: 20 },
      { status: 'Nháp', grand_total: 30 },
    ])
    expect(cards.map((c) => c.label)).toEqual(['Số đề nghị Nháp', 'Số đề nghị Đã gửi', 'Tổng tiền (VND)'])
    expect(cards[0].value).toBe(2)
    expect(cards[1].value).toBe(1)
    expect(cards[2].value).toBe('60')
  })
})

describe('kiểm tra form', () => {
  it('hợp lệ thì không có lỗi', () => {
    expect(validateForm(validForm())).toEqual({})
  })
  it('trường bắt buộc dùng câu chuẩn', () => {
    const errors = validateForm(emptyForm(''))
    expect(errors.customer).toBe('Vui lòng nhập khách hàng.')
    expect(errors.request_date).toBe('Vui lòng nhập ngày lập.')
    expect(errors.due_date).toBe('Vui lòng nhập hạn thanh toán.')
    expect(errors.items).toBe(MSG_NO_ITEMS)
  })
  it('hạn thanh toán trước ngày lập', () => {
    const form = validForm()
    form.due_date = '2027-01-09'
    expect(validateForm(form).due_date).toBe(MSG_DUE_BEFORE_REQUEST)
    form.due_date = '2027-01-10'
    expect(validateForm(form).due_date).toBeUndefined()
  })
  it('đợt trùng, khác khách hàng, đã thu đủ', () => {
    const form = validForm()
    form.items = [rowOf(ADVANCE), rowOf(ADVANCE)]
    expect(validateForm(form)['items.1.schedule']).toBe(MSG_DUP_ROW.replace('{0}', '2').replace('{1}', 'DT-1'))
    form.items = [rowOf({ ...ADVANCE, customer: 'KH-2' })]
    expect(validateForm(form)['items.0.schedule']).toBe(MSG_OTHER_CUSTOMER.replace('{0}', '1').replace('{1}', 'DT-1'))
    form.items = [rowOf({ ...ADVANCE, outstanding: 0 })]
    expect(validateForm(form)['items.0.schedule']).toBe(MSG_FULLY_PAID.replace('{0}', '1').replace('{1}', 'DT-1'))
  })
  it('dòng đã lưu có outstanding 0 thì không báo lỗi, dòng mới thì báo', () => {
    const form = validForm()
    form.items = [rowOf({ ...ADVANCE, outstanding: 0 }), rowOf({ ...LICENSE, outstanding: 0 })]
    const errors = validateForm(form, ['DT-1'])
    expect(errors['items.0.schedule']).toBeUndefined()
    expect(errors['items.1.schedule']).toBe(MSG_FULLY_PAID.replace('{0}', '2').replace('{1}', 'DT-2'))
  })
})

describe('tính tổng', () => {
  it('48.000.000, thuế 3.000.000; dòng trống bỏ qua', () => {
    const totals = formTotals(validForm().items)
    expect(totals).toEqual({ before: 45_000_000, tax: 3_000_000, total: 48_000_000 })
    expect(formTotals([])).toEqual({ before: 0, tax: 0, total: 0 })
  })
})

describe('chuyển dữ liệu và mặc định', () => {
  it('form mới nhận đủ 4 trường tài khoản và ngày lập hôm nay, có 1 dòng trống', () => {
    const form = emptyForm('2027-01-10', { bank_account_holder: 'LHA', bank_account_no: '123', bank_name: 'ACB', bank_branch: 'HN' })
    expect(form.request_date).toBe('2027-01-10')
    expect([form.bank_account_holder, form.bank_account_no, form.bank_name, form.bank_branch]).toEqual(['LHA', '123', 'ACB', 'HN'])
    expect(form.items).toHaveLength(1)
    expect(form.items[0].schedule).toBe('')
  })
  it('toPayload bỏ dòng trống, chỉ gửi mã đợt, chuỗi rỗng thành null', () => {
    const payload = toPayload(validForm())
    expect(payload.items).toEqual([{ schedule: 'DT-1' }, { schedule: 'DT-2' }])
    expect(payload.notes).toBeNull()
    expect(payload.bank_name).toBe('')
  })
  it('fromDoc thêm dòng trống cuối', () => {
    const doc = {
      name: 'DNTT-1', customer: 'KH-1', request_date: '2027-01-10', due_date: '2027-01-25', notes: 'x',
      items: [{ schedule: 'DT-1', schedule_name: 'Tạm ứng', outstanding: 5 }],
    } as unknown as PaymentRequest
    const form = fromDoc(doc)
    expect(form.items).toHaveLength(2)
    expect(form.items[0].outstanding).toBe(5)
    expect(form.items[1].schedule).toBe('')
    expect(form.notes).toBe('x')
  })
})

describe('prefillFromSchedules (mở từ Lịch thu tiền)', () => {
  const customers = { 'DT-1': 'KH-1', 'DT-2': 'KH-1', 'DT-3': 'KH-2', 'DT-4': 'KH-1' }
  it('điền khách hàng và các đợt hợp lệ, kèm 1 dòng trống', () => {
    const r = prefillFromSchedules(['DT-1', 'DT-2'], customers, [ADVANCE, LICENSE])
    expect(r.customer).toBe('KH-1')
    expect(r.items.map((i) => i.schedule)).toEqual(['DT-1', 'DT-2', ''])
    expect(r.skipped).toEqual([])
  })
  it('bỏ đợt khác khách hàng hoặc không còn nợ', () => {
    const r = prefillFromSchedules(['DT-1', 'DT-3', 'DT-4'], customers, [ADVANCE])
    expect(r.items.map((i) => i.schedule)).toEqual(['DT-1', ''])
    expect(r.skipped).toEqual(['DT-3', 'DT-4'])
  })
  it('không đợt nào hợp lệ thì chỉ còn dòng trống', () => {
    const r = prefillFromSchedules(['DT-9'], customers, [])
    expect(r.items).toHaveLength(1)
    expect(r.skipped).toEqual(['DT-9'])
  })
})

describe('in', () => {
  it('printUrl trỏ tới bản in PDF theo Print Format', () => {
    expect(printUrl('DNTT-2027-00001')).toBe(
      '/api/method/frappe.utils.print_format.download_pdf?doctype=Payment%20Request&name=DNTT-2027-00001&format=' +
        encodeURIComponent('Đề nghị thanh toán'),
    )
  })
})
