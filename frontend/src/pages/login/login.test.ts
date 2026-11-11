import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { useFormValidation } from '@/standard'
import {
  INVALID_LOGIN_MESSAGE,
  LOGIN_RULES,
  NETWORK_ERROR_MESSAGE,
  emptyLoginForm,
  loginErrorMessage,
  redirectTarget,
  safeRedirect,
  submitLogin,
} from './login'

describe('kiểm tra ô nhập', () => {
  it('bỏ trống cả hai ô thì báo lỗi bắt buộc', () => {
    const v = useFormValidation(reactive(emptyLoginForm()), LOGIN_RULES)
    expect(v.validateAll()).toBe(false)
    expect(v.errors.usr).toBe('Vui lòng nhập email hoặc tên đăng nhập.')
    expect(v.errors.pwd).toBe('Vui lòng nhập mật khẩu.')
  })
  it('email chỉ có khoảng trắng vẫn lỗi; mật khẩu khoảng trắng được chấp nhận; đủ cả hai thì hợp lệ', () => {
    const form = reactive({ usr: '   ', pwd: '  ' })
    const v = useFormValidation(form, LOGIN_RULES)
    expect(v.validateAll()).toBe(false)
    expect(v.errors.usr).toBeTruthy()
    expect(v.errors.pwd).toBeFalsy()
    form.usr = 'a@b.vn'
    form.pwd = 'x'
    expect(v.validateAll()).toBe(true)
  })
})

describe('safeRedirect', () => {
  it('giữ đường dẫn nội bộ', () => {
    expect(safeRedirect('/contracts/contract-types')).toBe('/contracts/contract-types')
    expect(safeRedirect('/app')).toBe('/app')
  })
  it.each([null, '', 'https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '/login', '/login?redirect-to=/app', '%2F%2Fevil.com'])(
    'bỏ qua %s',
    (raw) => expect(safeRedirect(raw)).toBe('/contracts'),
  )
  it('đọc redirect-to từ query', () => {
    expect(redirectTarget('?redirect-to=%2Fcontracts%2Fcontract-types')).toBe('/contracts/contract-types')
    expect(redirectTarget('')).toBe('/contracts')
  })
})

describe('loginErrorMessage', () => {
  it('401 là sai tài khoản', () => {
    expect(loginErrorMessage(401, { message: 'Invalid login credentials' })).toBe(INVALID_LOGIN_MESSAGE)
  })
  it('bị khóa tạm thì hiện câu của Frappe, bỏ thẻ HTML', () => {
    const inner = JSON.stringify({ message: '<b>Tài khoản tạm bị khóa</b>' })
    expect(loginErrorMessage(403, { _server_messages: JSON.stringify([inner]) })).toBe('Tài khoản tạm bị khóa')
  })
  it('body rỗng thì câu chung', () => {
    expect(loginErrorMessage(500, null)).toBe('Có lỗi xảy ra, vui lòng thử lại.')
  })
})

describe('submitLogin', () => {
  const form = { usr: '  a@b.vn ', pwd: 'mk' }
  it('thành công khi 200, gửi usr đã trim, pwd và CSRF', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    expect(await submitLogin(form, fetchFn as unknown as typeof fetch)).toEqual({ ok: true })
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe('/api/method/login')
    expect((init.body as URLSearchParams).get('usr')).toBe('a@b.vn')
    expect((init.body as URLSearchParams).get('pwd')).toBe('mk')
    expect(init.headers).toHaveProperty('X-Frappe-CSRF-Token')
  })
  it('401 thì thất bại với câu chuẩn', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })
    expect(await submitLogin(form, fetchFn as unknown as typeof fetch)).toEqual({ ok: false, message: INVALID_LOGIN_MESSAGE })
  })
  it('lỗi mạng', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('x'))
    expect(await submitLogin(form, fetchFn as unknown as typeof fetch)).toEqual({ ok: false, message: NETWORK_ERROR_MESSAGE })
  })
})
