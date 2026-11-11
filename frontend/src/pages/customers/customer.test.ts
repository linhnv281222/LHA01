import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { useFormValidation } from '@/standard'
import {
  COLUMNS,
  FORM_RULES,
  emptyFilters,
  emptyForm,
  filtersActive,
  groupTree,
  hasTaxCode,
  toFrappeFilters,
  toPayload,
} from './customer'

describe('Khách hàng', () => {
  it('thiếu tên thì báo "Vui lòng nhập tên khách hàng."', () => {
    const form = reactive(emptyForm())
    const v = useFormValidation(form, FORM_RULES)
    expect(v.validateAll()).toBe(false)
    expect(v.errors.customer_name).toBe('Vui lòng nhập tên khách hàng.')
    form.customer_name = 'Công ty A'
    expect(v.validateAll()).toBe(true)
  })

  it('kiểm tra số điện thoại và email', () => {
    const form = reactive({ ...emptyForm(), customer_name: 'A' })
    const v = useFormValidation(form, FORM_RULES)
    for (const phone of ['abc', '123', '09123456789012345678901']) {
      form.phone = phone
      expect(v.validateAll(), phone).toBe(false)
      expect(v.errors.phone).toBe('Số điện thoại không hợp lệ.')
    }
    form.phone = '+84 (912) 345-678'
    form.email = 'khong-hop-le'
    expect(v.validateAll()).toBe(false)
    expect(v.errors.email).toBe('Email không hợp lệ.')
    form.email = 'a@b.vn'
    expect(v.validateAll()).toBe(true)
  })

  it('mã số thuế tối đa 20 ký tự', () => {
    const form = reactive({ ...emptyForm(), customer_name: 'A', tax_code: '1'.repeat(21) })
    expect(useFormValidation(form, FORM_RULES).validateAll()).toBe(false)
  })

  it('payload: chuỗi rỗng thành null, đặc biệt mã số thuế', () => {
    const p = toPayload({ ...emptyForm(), customer_name: ' A ', tax_code: '   ', phone: ' 0912345678 ' })
    expect(p.customer_name).toBe('A')
    expect(p.tax_code).toBeNull()
    expect(p.phone).toBe('0912345678')
    expect(p.email).toBeNull()
  })

  it('hasTaxCode và cây nhóm', () => {
    expect(hasTaxCode({ tax_code: '010' })).toBe(true)
    expect(hasTaxCode({ tax_code: '  ' })).toBe(false)
    expect(hasTaxCode({ tax_code: null })).toBe(false)
    const tree = groupTree([{ tax_code: '1' }, { tax_code: null }, { tax_code: null }])
    expect(tree[0].count).toBe(3)
    expect(tree[0].children?.map((c) => [c.key, c.count])).toEqual([
      ['has_tax', 1],
      ['no_tax', 2],
    ])
  })

  it('bộ lọc panel đổi thành filters của Frappe', () => {
    const d = emptyFilters()
    expect(toFrappeFilters(d)).toEqual({})
    expect(toFrappeFilters({ ...d, groups: ['has_tax'] })).toEqual({ tax_code: ['is', 'set'] })
    expect(toFrappeFilters({ ...d, groups: ['no_tax'] })).toEqual({ tax_code: ['is', 'not set'] })
    expect(toFrappeFilters({ ...d, groups: [] })).toEqual({ name: ['in', []] })
    expect(toFrappeFilters({ ...d, customerName: ' A ', taxCode: '01', contactPerson: 'B' })).toEqual({
      customer_name: ['like', '%A%'],
      tax_code: ['like', '%01%'],
      contact_person: ['like', '%B%'],
    })
    expect(filtersActive(d)).toBe(false)
    expect(filtersActive({ ...d, groups: ['has_tax'] })).toBe(true)
    expect(filtersActive({ ...d, taxCode: '1' })).toBe(true)
  })

  it('cột số điện thoại được che, địa chỉ ẩn mặc định, không cột tổng', () => {
    const phone = COLUMNS.find((c) => c.key === 'phone')
    const row = { name: 'KH-00001', phone: '0912345678' } as never
    expect(phone?.format?.(row)).not.toBe('0912345678')
    expect(COLUMNS.find((c) => c.key === 'address')?.hidden).toBe(true)
    expect(COLUMNS.some((c) => c.sum)).toBe(false)
  })
})
