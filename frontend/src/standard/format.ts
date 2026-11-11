// Định dạng hiển thị dùng chung. Ngày theo DD/MM/YYYY, số theo kiểu Việt Nam (1.234.567).
import dayjs from 'dayjs'

export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = dayjs(value)
  return d.isValid() ? d.format('DD/MM/YYYY') : ''
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const d = dayjs(value)
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm') : ''
}

const numberFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? numberFmt.format(n) : ''
}

/** Tiền VND: không có phần thập phân, không ghi ký hiệu (đơn vị ghi ở tiêu đề cột). */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? numberFmt.format(Math.round(n)) : ''
}

/** Đọc số người dùng gõ theo kiểu Việt Nam: "1.234.567" hoặc "1234567,5". */
export function parseNumber(text: string): number | null {
  const cleaned = text.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Che một phần dữ liệu nhạy cảm (số điện thoại, CCCD): giữ 3 ký tự đầu và 3 ký tự cuối. */
export function maskSensitive(value: string | null | undefined): string {
  if (!value) return ''
  if (value.length <= 6) return '*'.repeat(value.length)
  return value.slice(0, 3) + '*'.repeat(value.length - 6) + value.slice(-3)
}
