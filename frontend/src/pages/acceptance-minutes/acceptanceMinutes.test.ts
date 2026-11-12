import { describe, expect, it } from 'vitest'
import {
  COLUMNS,
  ITEM_COLUMNS,
  MINUTES_STATUS,
  MSG_DUP_ROW,
  MSG_IN_OTHER_MINUTES,
  MSG_NO_ITEMS,
  MSG_NOT_REQUIRED,
  MSG_OTHER_CUSTOMER,
  applySchedule,
  canDelete,
  canMarkSigned,
  contentFromItems,
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
  validateItems,
  type AcceptableSchedule,
  type AcceptanceMinutes,
  type ItemForm,
} from './acceptanceMinutes'

const sched = (name: string, extra: Partial<AcceptableSchedule> = {}): AcceptableSchedule => ({
  name,
  schedule_name: `Đợt ${name}`,
  item_name: 'License',
  contract: 'HD-1',
  period_from: '2027-01-01',
  period_to: '2027-03-31',
  due_date: '2027-01-15',
  total_amount: 1000,
  requires_acceptance: 1,
  ...extra,
})

function item(name: string, extra: Partial<AcceptableSchedule> = {}): ItemForm {
  const it = emptyForm().items[0]
  applySchedule(it, { ...sched(name), customer: 'KH-A', ...extra })
  return it
}

function form(items: ItemForm[]) {
  const f = emptyForm('2027-04-10')
  f.customer = 'KH-A'
  f.items = [...items, ...emptyForm().items]
  return f
}

describe('danh sách chuẩn', () => {
  it('ghim STT và Số biên bản bên trái, Thao tác bên phải, có độ rộng', () => {
    expect(COLUMNS.filter((c) => c.pin === 'left').map((c) => c.key)).toEqual(['_index', 'name'])
    expect(COLUMNS.filter((c) => c.pin === 'right').map((c) => c.key)).toEqual(['_actions'])
    expect(COLUMNS.every((c) => c.width > 0)).toBe(true)
  })
  it('chỉ cột giá trị các đợt có dòng Tổng', () => {
    expect(COLUMNS.filter((c) => c.sum).map((c) => c.key)).toEqual(['grand_total'])
    expect(COLUMNS.find((c) => c.key === 'grand_total')?.label).toBe('Giá trị các đợt sau thuế (VND)')
    expect(COLUMNS.map((c) => c.label)).toEqual([
      'STT', 'Số biên bản', 'Khách hàng', 'Ngày nghiệm thu', 'Số đợt', 'Giá trị các đợt sau thuế (VND)', 'Trạng thái', 'Thao tác',
    ])
  })
  it('bảng đợt trong chi tiết', () => {
    expect(ITEM_COLUMNS.map((c) => c.label)).toEqual(['Hợp đồng', 'Hạng mục', 'Đợt', 'Kỳ từ', 'Kỳ đến', 'Hạn', 'Tổng tiền (VND)'])
  })
  it('groupTree đếm theo trạng thái', () => {
    const tree = groupTree([{ status: 'Nháp' }, { status: 'Đã ký' }, { status: 'Đã ký' }])
    expect(tree[0].count).toBe(3)
    expect(tree[0].children?.map((c) => [c.key, c.count])).toEqual([['Nháp', 1], ['Đã ký', 2]])
  })
  it('mặc định không lọc; đổi sang filters Frappe theo ngày nghiệm thu', () => {
    expect(toFrappeFilters(emptyFilters())).toEqual({})
    expect(filtersActive(emptyFilters())).toBe(false)
    const f = { ...emptyFilters(), groups: ['Đã ký'], customer: 'KH-A', dateFrom: '2027-01-01', dateTo: '2027-01-31', minutesNo: ' 001 ' }
    expect(toFrappeFilters(f)).toEqual({
      status: ['in', ['Đã ký']],
      customer: 'KH-A',
      minutes_date: ['between', ['2027-01-01', '2027-01-31']],
      name: ['like', '%001%'],
    })
    expect(filtersActive(f)).toBe(true)
  })
  it('một đầu ngày; không chọn nhóm nào thì không ra dòng nào', () => {
    expect(toFrappeFilters({ ...emptyFilters(), dateFrom: '2027-01-01' }).minutes_date).toEqual(['>=', '2027-01-01'])
    expect(toFrappeFilters({ ...emptyFilters(), dateTo: '2027-01-31' }).minutes_date).toEqual(['<=', '2027-01-31'])
    expect(toFrappeFilters({ ...emptyFilters(), groups: [], minutesNo: 'x' })).toEqual({ name: ['in', []] })
  })
  it('thẻ số liệu: tổng, Nháp, Đã ký, số đợt đã nghiệm thu (chỉ biên bản Đã ký)', () => {
    const cards = statCards([
      { status: 'Nháp', schedule_count: 2 },
      { status: 'Đã ký', schedule_count: 3 },
      { status: 'Đã ký', schedule_count: 1 },
    ])
    expect(cards.map((c) => [c.label, c.value])).toEqual([
      ['Tổng số biên bản', 3],
      ['Biên bản Nháp', 1],
      ['Biên bản Đã ký', 2],
      ['Số đợt đã nghiệm thu', 4],
    ])
    expect(cards.filter((c) => c.status).map((c) => c.key)).toEqual(['Nháp', 'Đã ký'])
  })
})

describe('trạng thái', () => {
  it('Nháp xám, Đã ký xanh, mặc định Nháp', () => {
    expect(MINUTES_STATUS['Nháp'].tone).toBe('gray')
    expect(MINUTES_STATUS['Đã ký'].tone).toBe('green')
    expect(statusOf({ status: undefined }).label).toBe('Nháp')
  })
  it('chỉ Nháp mới đánh dấu đã ký và xóa được; Đã ký khóa sửa', () => {
    expect(canMarkSigned('Nháp')).toBe(true)
    expect(canMarkSigned('Đã ký')).toBe(false)
    expect(canDelete('Nháp')).toBe(true)
    expect(canDelete('Đã ký')).toBe(false)
    expect(isLocked('Đã ký')).toBe(true)
    expect(isLocked('Nháp')).toBe(false)
  })
  it('printUrl trỏ tới bản in PDF theo Print Format', () => {
    const url = printUrl('BBNT-2027-00001')
    expect(url).toContain('frappe.utils.print_format.download_pdf')
    expect(url).toContain('doctype=Acceptance%20Minutes')
    expect(url).toContain('name=BBNT-2027-00001')
    expect(url).toContain(`format=${encodeURIComponent('Biên bản nghiệm thu')}`)
  })
})

describe('kiểm tra form', () => {
  it('hợp lệ thì không có lỗi', () => {
    expect(validateForm(form([item('A'), item('B')]))).toEqual({})
  })
  it('không có đợt nào báo MSG_NO_ITEMS và không gửi request', () => {
    expect(validateItems(form([]))).toEqual({ items: MSG_NO_ITEMS })
    expect(MSG_NO_ITEMS).toBe('Biên bản nghiệm thu phải có ít nhất 1 đợt thu.')
  })
  it('trường bắt buộc và độ dài', () => {
    const f = emptyForm('')
    f.items = [item('A')]
    const errors = validateForm(f)
    expect(errors.customer).toBeTruthy()
    expect(errors.minutes_date).toBeTruthy()
    const g = form([item('A')])
    g.party_b_rep = 'x'.repeat(141)
    expect(validateForm(g).party_b_rep).toBeTruthy()
  })
  it('đợt trùng, khác khách hàng, không cần nghiệm thu, đã nằm trong biên bản khác', () => {
    const errors = validateItems(
      form([
        item('A'),
        item('A'),
        item('B', { customer: 'KH-B' }),
        item('C', { requires_acceptance: 0 }),
        item('D', { acceptance_minutes: 'BBNT-2027-00009' }),
      ]),
    )
    expect(errors['items.1.schedule']).toBe(MSG_DUP_ROW.replace('{0}', '2').replace('{1}', 'A'))
    expect(errors['items.2.schedule']).toBe(MSG_OTHER_CUSTOMER.replace('{0}', '3').replace('{1}', 'B'))
    expect(errors['items.3.schedule']).toBe(MSG_NOT_REQUIRED.replace('{0}', '4').replace('{1}', 'C'))
    expect(errors['items.3.schedule']).toBe('Dòng 4: đợt C không cần nghiệm thu.')
    expect(errors['items.4.schedule']).toBe(
      MSG_IN_OTHER_MINUTES.replace('{0}', '5').replace('{1}', 'D').replace('{2}', 'BBNT-2027-00009'),
    )
    expect(errors['items.0.schedule']).toBeUndefined()
  })
})

describe('nội dung tự điền', () => {
  it('mỗi đợt một dòng: hạng mục - đợt (kỳ), đúng định dạng Python', () => {
    const items = [item('A'), item('B', { period_from: '', period_to: '', schedule_name: 'Tạm ứng', item_name: 'Triển khai' })]
    expect(contentFromItems([...items, ...emptyForm().items])).toBe(
      'License - Đợt A (01/01/2027 - 31/03/2027)\nTriển khai - Tạm ứng',
    )
  })
  it('chưa chọn đợt nào thì rỗng', () => {
    expect(contentFromItems(emptyForm().items)).toBe('')
  })
})

describe('dữ liệu form', () => {
  it('tổng chỉ tính dòng đã chọn đợt', () => {
    expect(formTotals([item('A'), item('B'), ...emptyForm().items])).toEqual({ count: 2, total: 2000 })
  })
  it('form mới có ngày hôm nay và 1 dòng trống; ensureBlankRow thêm dòng trống', () => {
    const f = emptyForm('2027-04-10')
    expect(f.minutes_date).toBe('2027-04-10')
    expect(f.items).toHaveLength(1)
    f.items = [item('A')]
    ensureBlankRow(f.items)
    expect(f.items).toHaveLength(2)
    ensureBlankRow(f.items)
    expect(f.items).toHaveLength(2)
  })
  it('toPayload bỏ dòng trống, chỉ gửi mã đợt, chuỗi rỗng thành null', () => {
    const f = form([item('A')])
    f.party_a_rep = ' Ông A '
    expect(toPayload(f)).toEqual({
      customer: 'KH-A',
      minutes_date: '2027-04-10',
      notes: null,
      content: null,
      party_a_rep: 'Ông A',
      party_b_rep: '',
      scan_file: null,
      items: [{ schedule: 'A' }],
    })
  })
  it('fromDoc thêm dòng trống cuối', () => {
    const doc = {
      customer: 'KH-A',
      minutes_date: '2027-04-10',
      content: 'ND',
      scan_file: '/files/a.pdf',
      items: [{ schedule: 'A', schedule_name: 'Đợt A', total_amount: 5 }],
    } as unknown as AcceptanceMinutes
    const f = fromDoc(doc)
    expect(f.items.map((i) => i.schedule)).toEqual(['A', ''])
    expect(f.scan_file).toBe('/files/a.pdf')
    expect(f.content).toBe('ND')
  })
})

describe('điền sẵn từ Lịch thu', () => {
  const available = [sched('A'), sched('B')]
  it('điền khách hàng và các đợt hợp lệ, kèm 1 dòng trống', () => {
    const r = prefillFromSchedules(['A', 'B'], { A: 'KH-A', B: 'KH-A' }, available)
    expect(r.customer).toBe('KH-A')
    expect(r.items.map((i) => i.schedule)).toEqual(['A', 'B', ''])
    expect(r.skipped).toEqual([])
  })
  it('đợt khác khách hàng hoặc không cần nghiệm thu vào skipped', () => {
    const r = prefillFromSchedules(['A', 'B', 'C'], { A: 'KH-A', B: 'KH-B', C: 'KH-A' }, available)
    expect(r.items.map((i) => i.schedule)).toEqual(['A', ''])
    expect(r.skipped).toEqual(['B', 'C'])
  })
  it('không đợt nào hợp lệ thì chỉ còn dòng trống', () => {
    const r = prefillFromSchedules(['X'], {}, available)
    expect(r.items).toHaveLength(1)
    expect(r.items[0].schedule).toBe('')
    expect(r.skipped).toEqual(['X'])
  })
})
