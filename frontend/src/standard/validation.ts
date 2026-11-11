// Kiểm tra dữ liệu form ngay trên trình duyệt, trước khi gửi lên server:
// - sai thì KHÔNG gửi request; báo lỗi dưới từng ô; focus ô lỗi đầu tiên
// - không xóa giá trị các ô đã hợp lệ
import { nextTick, reactive } from 'vue'

export interface FieldRule<V = Record<string, unknown>> {
  /** Nhãn của ô, dùng trong câu báo lỗi. */
  label: string
  required?: boolean
  maxLength?: number
  minLength?: number
  min?: number
  max?: number
  pattern?: { re: RegExp; message: string }
  /** Kiểm tra riêng: trả về câu báo lỗi, hoặc null nếu hợp lệ. */
  validate?: (value: unknown, values: V) => string | null
}

export type Rules<V> = Partial<Record<keyof V & string, FieldRule<V>>>

/** Viết thường chữ đầu, giữ nguyên phần còn lại ("Giá trị (VND)" → "giá trị (VND)"). */
export function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0)
}

export function checkField<V>(rule: FieldRule<V>, value: unknown, values: V): string | null {
  if (isEmpty(value)) return rule.required ? `Vui lòng nhập ${lowerFirst(rule.label)}.` : null
  if (typeof value === 'string') {
    const len = value.trim().length
    if (rule.maxLength !== undefined && len > rule.maxLength) return `${rule.label} tối đa ${rule.maxLength} ký tự.`
    if (rule.minLength !== undefined && len < rule.minLength) return `${rule.label} tối thiểu ${rule.minLength} ký tự.`
    if (rule.pattern && !rule.pattern.re.test(value.trim())) return rule.pattern.message
  }
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) return `${rule.label} phải từ ${rule.min} trở lên.`
    if (rule.max !== undefined && value > rule.max) return `${rule.label} không được lớn hơn ${rule.max}.`
  }
  return rule.validate ? rule.validate(value, values) : null
}

export function focusField(key: string) {
  const root = document.querySelector<HTMLElement>(`[data-field="${key}"]`)
  const target = root?.querySelector<HTMLElement>('input, textarea, button, [tabindex]')
  target?.focus()
  root?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

export function useFormValidation<V extends Record<string, unknown>>(values: V, rules: Rules<V>) {
  const errors = reactive<Record<string, string>>({})

  function validateField(key: keyof V & string): boolean {
    const rule = rules[key]
    if (!rule) return true
    const msg = checkField(rule, values[key], values)
    if (msg) errors[key] = msg
    else delete errors[key]
    return !msg
  }

  /** Kiểm tra tất cả; có lỗi thì focus ô lỗi đầu tiên (theo thứ tự khai báo rules) và trả về false. */
  function validateAll(): boolean {
    let firstBad: string | null = null
    for (const key of Object.keys(rules) as (keyof V & string)[]) {
      if (!validateField(key) && !firstBad) firstBad = key
    }
    if (firstBad) {
      const k = firstBad
      void nextTick(() => focusField(k))
    }
    return !firstBad
  }

  function clearErrors() {
    for (const k of Object.keys(errors)) delete errors[k]
  }

  return { errors, validateField, validateAll, clearErrors }
}

/** Câu báo lỗi dễ đọc từ lỗi Frappe trả về (bỏ thẻ HTML, ghép các message). */
export function serverErrorMessage(err: unknown): string {
  const e = err as { messages?: string[]; message?: string } | null
  const parts = (e?.messages?.length ? e.messages : [e?.message ?? '']).map((m) =>
    String(m)
      .replace(/<[^>]*>/g, '')
      .trim(),
  )
  const text = parts.filter(Boolean).join(' ')
  return text || 'Có lỗi xảy ra, vui lòng thử lại.'
}
