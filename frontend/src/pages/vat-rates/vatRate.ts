// Logic (không giao diện) của màn Thuế suất: cột bảng, trạng thái, quy tắc kiểm tra, bộ lọc gửi server.
import type { VATRate as VatRate } from '@/types/doctypes'
import {
  COMMON_STATUS,
  formatNumber,
  type Column,
  type FieldRule,
  type Rules,
  type StatusDef,
  type TreeNode,
} from '@/standard'

export const DOCTYPE = 'VAT Rate'

export type { VATRate as VatRate } from '@/types/doctypes'

export const MSG_NON_TAXABLE = 'Thuế suất không chịu thuế phải có tỷ lệ 0%.'

export function statusOf(row: Pick<VatRate, 'is_active'>): StatusDef {
  return row.is_active ? COMMON_STATUS.active : COMMON_STATUS.inactive
}

export const COLUMNS: Column<VatRate>[] = [
  { key: '_index', label: 'STT', width: 56, type: 'index', pin: 'left' },
  { key: 'rate_name', label: 'Tên thuế suất', width: 200, pin: 'left', required: true },
  { key: 'rate', label: 'Tỷ lệ (%)', width: 110, format: (r) => formatNumber(r.rate) },
  { key: 'is_non_taxable', label: 'Không chịu thuế', width: 150, format: (r) => (r.is_non_taxable ? 'Có' : '') },
  {
    key: 'is_active',
    label: 'Trạng thái',
    width: 150,
    type: 'status',
    status: statusOf,
    filter: 'select',
    options: [
      { label: 'Đang dùng', value: '1' },
      { label: 'Ngừng dùng', value: '0' },
    ],
  },
  { key: 'modified', label: 'Ngày cập nhật', width: 130, type: 'date' },
  { key: '_actions', label: 'Thao tác', width: 110, pin: 'right', sortable: false, filter: 'none', required: true },
]

/** Cây "Truy vấn nhóm": nhóm theo trạng thái, kèm số lượng. */
export function groupTree(rows: Pick<VatRate, 'is_active'>[]): TreeNode[] {
  const active = rows.filter((r) => r.is_active).length
  return [
    {
      key: 'all',
      label: 'Tất cả',
      icon: 'lucide-layers',
      count: rows.length,
      children: [
        { key: 'active', label: 'Đang dùng', icon: 'lucide-circle-check', count: active },
        { key: 'inactive', label: 'Ngừng dùng', icon: 'lucide-circle-pause', count: rows.length - active },
      ],
    },
  ]
}

export interface PanelFilters {
  groups: string[]
  rateName: string
}

export function emptyFilters(): PanelFilters {
  return { groups: ['active', 'inactive'], rateName: '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFrappeFilters(f: PanelFilters): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: Record<string, any> = {}
  const wantActive = f.groups.includes('active')
  const wantInactive = f.groups.includes('inactive')
  if (wantActive !== wantInactive) filters.is_active = wantActive ? 1 : 0
  if (!wantActive && !wantInactive) filters.name = ['in', []]
  if (f.rateName.trim()) filters.rate_name = ['like', `%${f.rateName.trim()}%`]
  return filters
}

export function filtersActive(f: PanelFilters): boolean {
  const d = emptyFilters()
  return f.rateName !== d.rateName || f.groups.length !== d.groups.length
}

export interface VatRateForm {
  rate_name: string
  rate: number
  is_non_taxable: boolean
  is_active: boolean
}

export function emptyForm(): VatRateForm {
  return { rate_name: '', rate: 0, is_non_taxable: false, is_active: true }
}

const rateRule: FieldRule<VatRateForm> = {
  label: 'Tỷ lệ (%)',
  required: true,
  min: 0,
  max: 100,
  validate: (v, values) => (values.is_non_taxable && Number(v) !== 0 ? MSG_NON_TAXABLE : null),
}

export const FORM_RULES: Rules<VatRateForm> = {
  rate_name: { label: 'Tên thuế suất', required: true, maxLength: 100 },
  rate: rateRule,
}

/** Tích "Không chịu thuế" thì tỷ lệ về 0. */
export function applyNonTaxable(form: VatRateForm): void {
  if (form.is_non_taxable) form.rate = 0
}

export function toPayload(form: VatRateForm): Omit<VatRate, 'name'> {
  return {
    rate_name: form.rate_name.trim(),
    rate: Number(form.rate) || 0,
    is_non_taxable: form.is_non_taxable ? 1 : 0,
    is_active: form.is_active ? 1 : 0,
  }
}
