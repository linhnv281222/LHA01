import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FnField from './FnField.vue'

describe('FnField type="password"', () => {
  it('mặc định ẩn mật khẩu, nút ẩn/hiện có nhãn tiếng Việt và Tab tới được', async () => {
    const w = mount(FnField, { props: { field: 'pwd', label: 'Mật khẩu', type: 'password', modelValue: 'bi-mat' } })
    const input = w.get('input')
    expect(input.attributes('type')).toBe('password')
    expect(input.attributes('autocomplete')).toBe('current-password')
    const btn = w.get('button[aria-label="Hiện mật khẩu"]')
    expect(btn.attributes('tabindex')).not.toBe('-1')
    expect(btn.attributes('aria-pressed')).toBe('false')
    await btn.trigger('click')
    expect(w.get('input').attributes('type')).toBe('text')
    expect(w.get('button[aria-label="Ẩn mật khẩu"]').attributes('aria-pressed')).toBe('true')
  })

  it('không có nút xóa nhanh và nhãn gắn với ô', () => {
    const w = mount(FnField, { props: { field: 'pwd', label: 'Mật khẩu', type: 'password', required: true, modelValue: 'x' } })
    expect(w.find('button[aria-label="Xóa Mật khẩu"]').exists()).toBe(false)
    expect(w.get('label').attributes('for')).toBe(w.get('input').attributes('id'))
  })
})
