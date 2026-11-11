// Logic trang đăng nhập (không giao diện). Quy tắc safeRedirect khớp với contract_tracker/login.py.
import { serverErrorMessage, type Rules } from '@/standard'

export interface LoginForm {
  usr: string
  pwd: string
}

export function emptyLoginForm(): LoginForm {
  return { usr: '', pwd: '' }
}

export const LOGIN_RULES: Rules<LoginForm> = {
  usr: { label: 'Email hoặc tên đăng nhập', required: true },
  pwd: { label: 'Mật khẩu', required: true },
}

export const INVALID_LOGIN_MESSAGE = 'Email hoặc mật khẩu không đúng.'
export const GENERIC_ERROR_MESSAGE = 'Có lỗi xảy ra, vui lòng thử lại.'
export const NETWORK_ERROR_MESSAGE = 'Không kết nối được máy chủ, vui lòng thử lại.'
export const FORGOT_PASSWORD_URL = '/login-classic#forgot'

function decodeOnce(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function safeRedirect(raw: string | null | undefined, fallback = '/contracts'): string {
  if (!raw) return fallback
  const value = decodeOnce(raw).trim()
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  // eslint-disable-next-line no-control-regex
  if (value.includes('://') || value.includes('\\') || /[\u0000-\u001f]/.test(value)) return fallback
  const path = value.split('?')[0].split('#')[0].replace(/\/+$/, '')
  if (path === '/login') return fallback
  // Kiểm tra trên giá trị đã giải mã, nhưng trả về chuỗi gốc để không giải mã hai lần.
  return raw.trim()
}

export function redirectTarget(search: string): string {
  return safeRedirect(new URLSearchParams(search).get('redirect-to'))
}

function serverMessageFrom(body: unknown): string {
  const b = (body ?? {}) as { _server_messages?: string; message?: unknown; exception?: string }
  const messages: string[] = []
  if (typeof b._server_messages === 'string') {
    try {
      for (const item of JSON.parse(b._server_messages) as string[]) {
        try {
          const parsed = JSON.parse(item) as { message?: string }
          if (parsed.message) messages.push(parsed.message)
        } catch {
          messages.push(String(item))
        }
      }
    } catch {
      /* bỏ qua */
    }
  }
  if (!messages.length && typeof b.message === 'string') messages.push(b.message)
  if (!messages.length && typeof b.exception === 'string') messages.push(b.exception.replace(/^[\w.]+:\s*/, ''))
  return serverErrorMessage({ messages })
}

export function loginErrorMessage(status: number, body: unknown): string {
  const excType = (body as { exc_type?: string } | null)?.exc_type
  if (status === 401 || excType === 'AuthenticationError') return INVALID_LOGIN_MESSAGE
  return serverMessageFrom(body)
}

export type LoginResult = { ok: true } | { ok: false; message: string }

export async function submitLogin(form: LoginForm, fetchFn: typeof fetch = (...a) => fetch(...a)): Promise<LoginResult> {
  let res: Response
  try {
    res = await fetchFn('/api/method/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Frappe-CSRF-Token': (window as unknown as { csrf_token?: string }).csrf_token ?? '',
      },
      body: new URLSearchParams({ usr: form.usr.trim(), pwd: form.pwd }),
    })
  } catch {
    return { ok: false, message: NETWORK_ERROR_MESSAGE }
  }
  if (res.ok) return { ok: true }
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* không có nội dung JSON */
  }
  return { ok: false, message: loginErrorMessage(res.status, body) }
}
