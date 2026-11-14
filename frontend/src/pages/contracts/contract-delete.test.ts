import { describe, expect, it } from 'vitest'
import {
  COLUMNS,
  MAX_DELETE,
  canDeleteInPanel,
  canRevert,
  deleteConfirmMessage,
  deleteConfirmTitle,
  deleteResultText,
  listColumns,
  panelClosesAfterDelete,
  pruneSelected,
  selectAllNames,
  toggleSelected,
} from './contract'

describe('chọn nhiều hợp đồng', () => {
  it('thêm và bỏ một tên', () => {
    expect(toggleSelected(['A'], 'B', true)).toEqual(['A', 'B'])
    expect(toggleSelected(['A', 'B'], 'A', false)).toEqual(['B'])
    expect(toggleSelected(['A'], 'A', true)).toEqual(['A'])
  })
  it('bỏ tên không còn trong danh sách (sau khi xóa hoặc lọc)', () => {
    expect(pruneSelected(['A', 'B', 'C'], [])).toEqual([])
    expect(pruneSelected(['A', 'B', 'C'], ['B', 'D'])).toEqual(['B'])
  })
  it('chọn tất cả: quá 100 dòng thì không chọn', () => {
    const rows = (n: number) => Array.from({ length: n }, (_v, i) => ({ name: `HD-${i}` }))
    expect(selectAllNames(rows(3))).toEqual(['HD-0', 'HD-1', 'HD-2'])
    expect(selectAllNames(rows(MAX_DELETE))).toHaveLength(MAX_DELETE)
    expect(selectAllNames(rows(MAX_DELETE + 1))).toBeNull()
  })
})

describe('cột chọn theo quyền', () => {
  it('không có quyền xóa thì không có cột chọn', () => {
    expect(listColumns(false).some((c) => c.key === '_select')).toBe(false)
    expect(listColumns(false)).toBe(COLUMNS)
  })
  it('có quyền xóa thì cột chọn đứng đầu', () => {
    expect(listColumns(true)[0].key).toBe('_select')
    expect(listColumns(true)).toHaveLength(COLUMNS.length + 1)
  })
})

describe('câu thông báo xóa', () => {
  it('tiêu đề xác nhận', () => {
    expect(deleteConfirmTitle(['HD-1', 'HD-2', 'HD-3', 'HD-4', 'HD-5'])).toBe('Xóa 5 hợp đồng?')
    expect(deleteConfirmTitle(['HD-001'])).toBe('Xóa hợp đồng HD-001?')
  })
  it('nội dung xác nhận liệt kê tối đa 10 số', () => {
    expect(deleteConfirmMessage(['HD-1', 'HD-2'])).toBe('HD-1, HD-2.')
    const names = Array.from({ length: 13 }, (_v, i) => `HD-${i + 1}`)
    expect(deleteConfirmMessage(names)).toBe(`${names.slice(0, 10).join(', ')} và 3 hợp đồng khác.`)
  })
  it('kết quả', () => {
    expect(deleteResultText({ deleted: ['A', 'B', 'C'], skipped: [] })).toBe('Đã xóa 3, bỏ qua 0')
    expect(
      deleteResultText({
        deleted: ['A', 'B', 'C'],
        skipped: [
          { name: 'D', reason: 'x' },
          { name: 'E', reason: 'y' },
        ],
      }),
    ).toBe('Đã xóa 3, bỏ qua 2')
  })
})

describe('panel chi tiết', () => {
  it('đóng khi hợp đồng đang mở bị xóa', () => {
    expect(panelClosesAfterDelete('HD-1', ['HD-1', 'HD-2'])).toBe(true)
    expect(panelClosesAfterDelete('HD-3', ['HD-1', 'HD-2'])).toBe(false)
    expect(panelClosesAfterDelete(null, ['HD-1'])).toBe(false)
  })
  it('nút Xóa hợp đồng: chỉ Nháp và có quyền xóa', () => {
    expect(canDeleteInPanel('Nháp', true)).toBe(true)
    expect(canDeleteInPanel('Nháp', false)).toBe(false)
    for (const s of ['Đang hiệu lực', 'Hết hạn', 'Đã thanh lý', 'Đã hủy']) expect(canDeleteInPanel(s, true)).toBe(false)
  })
  it('nút Chuyển về Nháp: chỉ Admin và hợp đồng Đang hiệu lực', () => {
    expect(canRevert('Đang hiệu lực', true)).toBe(true)
    expect(canRevert('Đang hiệu lực', false)).toBe(false)
    for (const s of ['Nháp', 'Hết hạn', 'Đã thanh lý', 'Đã hủy']) expect(canRevert(s, true)).toBe(false)
  })
})
