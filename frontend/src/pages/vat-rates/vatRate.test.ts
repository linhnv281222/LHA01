import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { useFormValidation } from '@/standard'
import {
  COLUMNS,
  FORM_RULES,
  MSG_NON_TAXABLE,
  applyNonTaxable,
  emptyFilters,
  emptyForm,
  filtersActive,
  groupTree,
  toFrappeFilters,
  toPayload,
} from './vatRate'

describe('Thuế suất', () => {
  it('không chịu thuế mà tỷ lệ khác 0 thì báo lỗi, tỷ lệ 0 thì hợp lệ', () => {
    const form = reactive({ ...emptyForm(), rate_name: 'KCT', rate: 5, is_non_taxable: true })
    const v = useFormValidation(form, FORM_RULES)
    expect(v.validateAll()).toBe(false)
    expect(v.errors.rate).toBe(MSG_NON_TAXABLE)
    expect(MSG_NON_TAXABLE).toBe('Thuế suất không chịu thuế phải có tỷ lệ 0%.')
    form.rate = 0
    expect(v.validateAll()).toBe(true)
  })

  it('applyNonTaxable đặt tỷ lệ về 0 khi tích, giữ nguyên khi bỏ tích', () => {
    const form = { ...emptyForm(), rate: 8, is_non_taxable: true }
    applyNonTaxable(form)
    expect(form.rate).toBe(0)
    const other = { ...emptyForm(), rate: 8 }
    applyNonTaxable(other)
    expect(other.rate).toBe(8)
  })

  it('tỷ lệ phải từ 0 đến 100, tên bắt buộc và tối đa 100 ký tự', () => {
    const form = reactive({ ...emptyForm(), rate_name: 'A', rate: -1 })
    const v = useFormValidation(form, FORM_RULES)
    expect(v.validateAll()).toBe(false)
    expect(v.errors.rate).toContain('từ 0')
    form.rate = 101
    expect(v.validateAll()).toBe(false)
    expect(v.errors.rate).toContain('100')
    form.rate = 100
    expect(v.validateAll()).toBe(true)
    form.rate_name = ''
    expect(v.validateAll()).toBe(false)
    expect(v.errors.rate_name).toBe('Vui lòng nhập tên thuế suất.')
    form.rate_name = 'x'.repeat(101)
    expect(v.validateAll()).toBe(false)
  })

  it('cây nhóm có số lượng', () => {
    const tree = groupTree([{ is_active: 1 }, { is_active: 1 }, { is_active: 0 }])
    expect(tree[0].count).toBe(3)
    expect(tree[0].children?.map((c) => c.count)).toEqual([2, 1])
  })

  it('bộ lọc panel đổi thành filters của Frappe', () => {
    expect(toFrappeFilters(emptyFilters())).toEqual({})
    expect(toFrappeFilters({ groups: ['inactive'], rateName: ' 10 ' })).toEqual({
      is_active: 0,
      rate_name: ['like', '%10%'],
    })
    expect(toFrappeFilters({ groups: [], rateName: '' })).toEqual({ name: ['in', []] })
    expect(filtersActive(emptyFilters())).toBe(false)
    expect(filtersActive({ ...emptyFilters(), rateName: 'a' })).toBe(true)
  })

  it('payload chuẩn hóa tên và checkbox', () => {
    expect(toPayload({ rate_name: ' 10% ', rate: 10, is_non_taxable: false, is_active: true })).toEqual({
      rate_name: '10%',
      rate: 10,
      is_non_taxable: 0,
      is_active: 1,
    })
  })

  it('bảng không có cột cộng dòng Tổng', () => {
    expect(COLUMNS.some((c) => c.sum)).toBe(false)
  })
})
