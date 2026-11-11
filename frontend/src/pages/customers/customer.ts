// Logic (không giao diện) của màn Khách hàng: cột bảng, nhóm, quy tắc kiểm tra, bộ lọc gửi server.
import type { ContractCustomer } from '@/types/doctypes'
import { maskSensitive, type Column, type Rules, type TreeNode } from '@/standard'

export const DOCTYPE = 'Contract Customer'

export type { ContractCustomer } from '@/types/doctypes'

// Khớp PHONE_PATTERN và câu báo lỗi ở contract_customer.py.
export const PHONE_PATTERN = /^[0-9 +().\-]{8,20}$/
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function hasTaxCode(row: Pick<ContractCustomer, 'tax_code'>): boolean {
  return !!(row.tax_code && String(row.tax_code).trim())
}

export const COLUMNS: Column<ContractCustomer>[] = [
  { key: '_index', label: 'STT', width: 56, type: 'index', pin: 'left' },
  { key: 'name', label: 'Mã', width: 120, pin: 'left', required: true },
  { key: 'customer_name', label: 'Tên khách hàng', width: 260 },
  { key: 'tax_code', label: 'Mã số thuế', width: 140 },
  { key: 'contact_person', label: 'Người liên hệ', width: 180 },
  { key: 'phone', label: 'Số điện thoại', width: 140, format: (r) => maskSensitive(r.phone) },
  { key: 'email', label: 'Email', width: 200 },
  { key: 'address', label: 'Địa chỉ', width: 280, hidden: true },
  { key: 'modified', label: 'Ngày cập nhật', width: 130, type: 'date' },
  { key: '_actions', label: 'Thao tác', width: 110, pin: 'right', sortable: false, filter: 'none', required: true },
]

/** Cây "Truy vấn nhóm": có / chưa có mã số thuế, kèm số lượng. */
export function groupTree(rows: Pick<ContractCustomer, 'tax_code'>[]): TreeNode[] {
  const has = rows.filter(hasTaxCode).length
  return [
    {
      key: 'all',
      label: 'Tất cả khách hàng',
      icon: 'lucide-layers',
      count: rows.length,
      children: [
        { key: 'has_tax', label: 'Có mã số thuế', icon: 'lucide-badge-check', count: has },
        { key: 'no_tax', label: 'Chưa có mã số thuế', icon: 'lucide-badge-minus', count: rows.length - has },
      ],
    },
  ]
}

export interface PanelFilters {
  groups: string[]
  customerName: string
  taxCode: string
  contactPerson: string
}

export function emptyFilters(): PanelFilters {
  return { groups: ['has_tax', 'no_tax'], customerName: '', taxCode: '', contactPerson: '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFrappeFilters(f: PanelFilters): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: Record<string, any> = {}
  const hasTax = f.groups.includes('has_tax')
  const noTax = f.groups.includes('no_tax')
  if (!hasTax && !noTax) filters.name = ['in', []]
  const like = (v: string) => ['like', `%${v.trim()}%`]
  if (f.customerName.trim()) filters.customer_name = like(f.customerName)
  if (f.contactPerson.trim()) filters.contact_person = like(f.contactPerson)
  if (f.taxCode.trim()) filters.tax_code = like(f.taxCode)
  else if (hasTax && !noTax) filters.tax_code = ['is', 'set']
  else if (noTax && !hasTax) filters.tax_code = ['is', 'not set']
  return filters
}

export function filtersActive(f: PanelFilters): boolean {
  const d = emptyFilters()
  return (
    f.customerName !== d.customerName ||
    f.taxCode !== d.taxCode ||
    f.contactPerson !== d.contactPerson ||
    f.groups.length !== d.groups.length
  )
}

export interface CustomerForm {
  customer_name: string
  tax_code: string
  address: string
  contact_person: string
  representative_title: string
  phone: string
  email: string
  bank_account: string
  bank_name: string
  notes: string
}

export function emptyForm(): CustomerForm {
  return {
    customer_name: '',
    tax_code: '',
    address: '',
    contact_person: '',
    representative_title: '',
    phone: '',
    email: '',
    bank_account: '',
    bank_name: '',
    notes: '',
  }
}

export const FORM_RULES: Rules<CustomerForm> = {
  customer_name: { label: 'Tên khách hàng', required: true, maxLength: 140 },
  tax_code: { label: 'Mã số thuế', maxLength: 20 },
  address: { label: 'Địa chỉ', maxLength: 1000 },
  contact_person: { label: 'Người liên hệ', maxLength: 140 },
  representative_title: { label: 'Chức vụ người đại diện', maxLength: 140 },
  phone: { label: 'Số điện thoại', pattern: { re: PHONE_PATTERN, message: 'Số điện thoại không hợp lệ.' } },
  email: { label: 'Email', maxLength: 140, pattern: { re: EMAIL_PATTERN, message: 'Email không hợp lệ.' } },
  bank_account: { label: 'Số tài khoản', maxLength: 140 },
  bank_name: { label: 'Ngân hàng', maxLength: 140 },
  notes: { label: 'Ghi chú', maxLength: 1000 },
}

/** Chuỗi rỗng gửi null (nhất là mã số thuế, để không bị tính trùng). */
export function toPayload(form: CustomerForm): Omit<ContractCustomer, 'name'> {
  const v = (s: string) => s.trim() || null
  return {
    customer_name: form.customer_name.trim(),
    tax_code: v(form.tax_code),
    address: v(form.address),
    contact_person: v(form.contact_person),
    representative_title: v(form.representative_title),
    phone: v(form.phone),
    email: v(form.email),
    bank_account: v(form.bank_account),
    bank_name: v(form.bank_name),
    notes: v(form.notes),
  }
}
