// Phần logic (không giao diện) của màn Loại hợp đồng: cột bảng, trạng thái, quy tắc kiểm tra, bộ lọc gửi server.
// Tách riêng để test bằng vitest. Màn hình mới làm theo đúng cách chia này.
import type { ContractType } from '@/types/doctypes'
import { COMMON_STATUS, type Column, type FieldRule, type Rules, type StatusDef, type TreeNode } from '@/standard'

export const DOCTYPE = 'Contract Type'

export type { ContractType } from '@/types/doctypes'

export const CODE_PATTERN = /^[A-Z0-9_]{1,20}$/

export function statusOf(row: Pick<ContractType, 'is_active'>): StatusDef {
  return row.is_active ? COMMON_STATUS.active : COMMON_STATUS.inactive
}

export const COLUMNS: Column<ContractType>[] = [
  { key: '_index', label: 'STT', width: 56, type: 'index', pin: 'left' },
  { key: 'code', label: 'Mã', width: 130, pin: 'left', required: true },
  { key: 'type_name', label: 'Tên loại hợp đồng', width: 260 },
  { key: 'description', label: 'Mô tả', width: 320 },
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
  { key: 'owner', label: 'Người tạo', width: 200, hidden: true },
  { key: 'creation', label: 'Ngày tạo', width: 120, type: 'date' },
  { key: 'modified', label: 'Ngày cập nhật', width: 130, type: 'date' },
  { key: '_actions', label: 'Thao tác', width: 110, pin: 'right', sortable: false, filter: 'none', required: true },
]

/** Cây "Truy vấn nhóm": nhóm theo trạng thái, kèm số lượng. */
export function groupTree(rows: Pick<ContractType, 'is_active'>[]): TreeNode[] {
  const active = rows.filter((r) => r.is_active).length
  return [
    {
      key: 'all',
      label: 'Tất cả trạng thái',
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
  code: string
  typeName: string
  createdFrom: string
  createdTo: string
}

export function emptyFilters(): PanelFilters {
  return { groups: ['active', 'inactive'], code: '', typeName: '', createdFrom: '', createdTo: '' }
}

/** Đổi bộ lọc panel trái thành filters của Frappe (lọc phía server). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFrappeFilters(f: PanelFilters): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: Record<string, any> = {}
  const wantActive = f.groups.includes('active')
  const wantInactive = f.groups.includes('inactive')
  if (wantActive !== wantInactive) filters.is_active = wantActive ? 1 : 0
  if (!wantActive && !wantInactive) filters.name = ['in', []]
  if (f.code.trim()) filters.code = ['like', `%${f.code.trim().toUpperCase()}%`]
  if (f.typeName.trim()) filters.type_name = ['like', `%${f.typeName.trim()}%`]
  if (f.createdFrom && f.createdTo) filters.creation = ['between', [f.createdFrom, f.createdTo]]
  else if (f.createdFrom) filters.creation = ['>=', f.createdFrom]
  else if (f.createdTo) filters.creation = ['<=', `${f.createdTo} 23:59:59`]
  return filters
}

export function filtersActive(f: PanelFilters): boolean {
  const d = emptyFilters()
  return (
    f.code !== d.code ||
    f.typeName !== d.typeName ||
    f.createdFrom !== d.createdFrom ||
    f.createdTo !== d.createdTo ||
    f.groups.length !== d.groups.length
  )
}

export interface ContractTypeForm {
  code: string
  type_name: string
  is_active: boolean
  description: string
}

export function emptyForm(): ContractTypeForm {
  return { code: '', type_name: '', is_active: true, description: '' }
}

const codeRule: FieldRule<ContractTypeForm> = {
  label: 'Mã',
  required: true,
  validate: (v) =>
    CODE_PATTERN.test(String(v).trim().toUpperCase())
      ? null
      : 'Mã chỉ gồm chữ in hoa, chữ số và dấu gạch dưới, tối đa 20 ký tự.',
}

export const FORM_RULES: Rules<ContractTypeForm> = {
  code: codeRule,
  type_name: { label: 'Tên loại hợp đồng', required: true, maxLength: 140 },
  description: { label: 'Mô tả', maxLength: 1000 },
}

/** Dữ liệu gửi lên server: chuẩn hóa mã thành chữ in hoa, đổi checkbox thành 0/1. */
export function toPayload(form: ContractTypeForm): Omit<ContractType, 'name'> {
  return {
    code: form.code.trim().toUpperCase(),
    type_name: form.type_name.trim(),
    is_active: form.is_active ? 1 : 0,
    description: form.description.trim() || null,
  }
}
