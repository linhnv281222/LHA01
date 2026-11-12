import { describe, expect, it } from 'vitest'
import {
  applyLayout,
  inRect,
  moveCell,
  rectOf,
  selectionToTsv,
  autofitWidth,
  headerSegments,
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

  it('Excel: khóa đến cột / từ cột, độ rộng người dùng kéo', () => {
    const cols = [
      { key: 'a', label: 'A', width: 50, pin: 'left' as const },
      { key: 'b', label: 'B', width: 100 },
      { key: 'c', label: 'C', width: 100 },
      { key: 'd', label: 'D', width: 80, pin: 'right' as const },
    ]
    const pins = (l: any) => applyLayout(cols, l).map((c) => c.pin ?? '-').join('')
    expect(pins({ widths: {} })).toBe('left--right')
    expect(pins({ widths: {}, leftUntil: 'b' })).toBe('leftleft-right')
    expect(pins({ widths: {}, leftUntil: null, rightFrom: null })).toBe('----')
    expect(pins({ widths: {}, leftUntil: 'c', rightFrom: 'b' })).toBe('leftleftleftright')
    expect(applyLayout(cols, { widths: { b: 20, c: 180.4 } }).map((c) => c.width)).toEqual([50, 48, 180, 80])
  })

  it('Excel: tiêu đề 2 cấp gộp cột liền nhau cùng nhóm; nhấp đúp vừa nội dung', () => {
    const seg = headerSegments([
      { key: 'no', label: 'Số', width: 1 },
      { key: 'f', label: 'Từ', width: 1, group: 'Hiệu lực' },
      { key: 't', label: 'Đến', width: 1, group: 'Hiệu lực' },
      { key: 'v', label: 'Giá trị', width: 1 },
    ])
    expect(seg).toEqual([
      { group: '', keys: ['no'] },
      { group: 'Hiệu lực', keys: ['f', 't'] },
      { group: '', keys: ['v'] },
    ])
    expect(autofitWidth(['ab', 'abcdef'], (s) => s.length * 10)).toBe(100)
    expect(autofitWidth([], () => 0)).toBe(48)
    expect(autofitWidth(['x'.repeat(100)], (s) => s.length * 10)).toBe(600)
  })

  it('Excel: sao chép vùng chọn thành TSV, số giữ dạng số, có tiêu đề nhóm', () => {
    const cols = [
      { key: '_i', label: 'STT', width: 1, type: 'index' as const },
      { key: 'no', label: 'Số', width: 1 },
      { key: 'v', label: 'Sau thuế', width: 1, type: 'currency' as const, group: 'Giá trị' },
    ]
    const rows = [
      { no: 'HĐ-1', v: 1234567 },
      { no: 'HĐ\t2', v: 10 },
    ]
    expect(selectionToTsv(rows, cols, rectOf({ r: 1, c: 2 }, { r: 0, c: 0 }), false, 20)).toBe('21\tHĐ-1\t1234567\r\n22\tHĐ 2\t10')
    expect(selectionToTsv(rows, cols, { r1: 0, c1: 1, r2: 0, c2: 2 }, true)).toBe('Số\tGiá trị - Sau thuế\r\nHĐ-1\t1234567')
    expect(inRect({ r1: 0, c1: 0, r2: 1, c2: 1 }, 1, 1)).toBe(true)
    expect(inRect(null, 0, 0)).toBe(false)
  })

  it('Excel: phím di chuyển ô trong giới hạn bảng', () => {
    expect(moveCell({ r: 0, c: 0 }, 'ArrowUp', 5, 4)).toEqual({ r: 0, c: 0 })
    expect(moveCell({ r: 2, c: 1 }, 'ArrowDown', 5, 4, true)).toEqual({ r: 4, c: 1 })
    expect(moveCell({ r: 2, c: 1 }, 'End', 5, 4)).toEqual({ r: 2, c: 3 })
    expect(moveCell({ r: 2, c: 1 }, 'Home', 5, 4, true)).toEqual({ r: 0, c: 0 })
    expect(moveCell({ r: 2, c: 3 }, 'Tab', 5, 4)).toEqual({ r: 2, c: 3 })
  })
})
