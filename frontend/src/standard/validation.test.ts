import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { checkField, serverErrorMessage, useFormValidation } from './validation'

describe('kiểm tra form', () => {
  it('báo thiếu trường bắt buộc và quá độ dài', () => {
    expect(checkField({ label: 'Tên', required: true }, '  ', {})).toBe('Vui lòng nhập tên.')
    expect(checkField({ label: 'Tên', maxLength: 3 }, 'abcd', {})).toBe('Tên tối đa 3 ký tự.')
    expect(checkField({ label: 'Số', min: 1 }, 0, {})).toBe('Số phải từ 1 trở lên.')
    expect(checkField({ label: 'Tên' }, '', {})).toBeNull()
    expect(checkField({ label: 'Giá trị (VND)', required: true }, null, {})).toBe('Vui lòng nhập giá trị (VND).')
  })
  it('không xóa giá trị ô hợp lệ khi có ô lỗi', () => {
    const values = reactive({ a: 'giữ nguyên', b: '' })
    const v = useFormValidation(values, { a: { label: 'A', required: true }, b: { label: 'B', required: true } })
    expect(v.validateAll()).toBe(false)
    expect(values.a).toBe('giữ nguyên')
    expect(v.errors.b).toBe('Vui lòng nhập b.')
    expect(v.errors.a).toBeUndefined()
  })
  it('đọc lỗi Frappe, bỏ thẻ HTML', () => {
    expect(serverErrorMessage({ messages: ['<b>Mã</b> đã tồn tại'] })).toBe('Mã đã tồn tại')
    expect(serverErrorMessage(null)).toBe('Có lỗi xảy ra, vui lòng thử lại.')
  })
})
