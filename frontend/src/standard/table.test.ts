import { describe, expect, it } from 'vitest'
import {
  applyColumnFilters,
  computeTotals,
  nextSort,
  normalizeText,
  pageInfo,
  paginate,
  pinOffsets,
  sortRows,
  toCsv,
  type Column,
} from './table'

type Row = { name: string; title: string; amount: number | null; status: string }
const cols: Column<Row>[] = [
  { key: '_index', label: 'STT', width: 50, type: 'index', pin: 'left' },
  { key: 'name', label: 'Mã', width: 100, pin: 'left' },
  { key: 'title', label: 'Tên', width: 200 },
  { key: 'amount', label: 'Giá trị (VND)', width: 120, type: 'currency', sum: true },
  { key: 'status', label: 'TT', width: 80, filter: 'select', pin: 'right' },
]
const rows: Row[] = [
  { name: 'A1', title: 'Hợp đồng thuê nhà', amount: 1000, status: 'x' },
  { name: 'A2', title: 'Mua bán', amount: null, status: 'y' },
  { name: 'A10', title: 'Đại lý', amount: 2500, status: 'x' },
]

describe('bảng chuẩn', () => {
  it('lọc không phân biệt dấu và hoa thường', () => {
    expect(normalizeText('Đại Lý')).toBe('dai ly')
    expect(applyColumnFilters(rows, cols, { title: 'hop dong' }).map((r) => r.name)).toEqual(['A1'])
    expect(applyColumnFilters(rows, cols, { status: 'x' }).map((r) => r.name)).toEqual(['A1', 'A10'])
  })

  it('sắp xếp số tự nhiên, ô trống luôn cuối', () => {
    expect(sortRows(rows, cols, { key: 'name', dir: 'asc' }).map((r) => r.name)).toEqual(['A1', 'A2', 'A10'])
    expect(sortRows(rows, cols, { key: 'amount', dir: 'desc' }).map((r) => r.name)).toEqual(['A10', 'A1', 'A2'])
    expect(sortRows(rows, cols, { key: 'amount', dir: 'asc' }).map((r) => r.name)).toEqual(['A1', 'A10', 'A2'])
  })

  it('bấm tiêu đề: tăng → giảm → bỏ', () => {
    let s = nextSort(null, 'a')
    expect(s).toEqual({ key: 'a', dir: 'asc' })
    s = nextSort(s, 'a')
    expect(s).toEqual({ key: 'a', dir: 'desc' })
    expect(nextSort(s, 'a')).toBeNull()
  })

  it('phân trang và dòng (a-b / tổng)', () => {
    expect(pageInfo(45, 3, 20)).toEqual({ page: 3, pageCount: 3, from: 41, to: 45, total: 45 })
    expect(pageInfo(0, 1, 20)).toEqual({ page: 1, pageCount: 1, from: 0, to: 0, total: 0 })
    expect(pageInfo(10, 9, 20).page).toBe(1)
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4])
  })

  it('dòng Tổng cộng trên tập đã lọc, bỏ ô trống', () => {
    expect(computeTotals(rows, cols)).toEqual({ amount: 3500 })
  })

  it('vị trí cột ghim', () => {
    expect(pinOffsets(cols)).toEqual({
      _index: { side: 'left', offset: 0 },
      name: { side: 'left', offset: 50 },
      status: { side: 'right', offset: 0 },
    })
  })

  it('xuất CSV có BOM, số giữ dạng số', () => {
    const csv = toCsv(rows.slice(0, 1), cols)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('STT,Mã,Tên,Giá trị (VND),TT')
    expect(csv).toContain('1,A1,Hợp đồng thuê nhà,1000,x')
  })
})
