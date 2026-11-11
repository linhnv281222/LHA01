import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { useFormValidation } from '@/standard'
import { FORM_RULES, emptyFilters, emptyForm, toFrappeFilters, toPayload } from './contractType'

describe('Loại hợp đồng', () => {
  it('mã sai định dạng thì không hợp lệ, mã viết thường được chấp nhận vì sẽ chuẩn hóa', () => {
    const form = reactive({ ...emptyForm(), code: 'HĐ-01', type_name: 'Thuê' })
    const v = useFormValidation(form, FORM_RULES)
    expect(v.validateAll()).toBe(false)
    expect(v.errors.code).toContain('chữ in hoa')
    form.code = 'hd_01'
    expect(v.validateAll()).toBe(true)
    expect(toPayload(form).code).toBe('HD_01')
  })

  it('bộ lọc panel đổi thành filters của Frappe', () => {
    const f = { ...emptyFilters(), groups: ['active'], code: 'hd', createdFrom: '2026-01-01' }
    expect(toFrappeFilters(f)).toEqual({ is_active: 1, code: ['like', '%HD%'], creation: ['>=', '2026-01-01'] })
    expect(toFrappeFilters(emptyFilters())).toEqual({})
    expect(toFrappeFilters({ ...emptyFilters(), groups: [] })).toEqual({ name: ['in', []] })
  })
})
