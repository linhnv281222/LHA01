import { describe, expect, it } from 'vitest'
import { checkState, filterTree, toggleNode, type TreeNode } from './tree'

const tree: TreeNode = {
  key: 'root',
  label: 'Công ty',
  children: [
    { key: 'a', label: 'Phòng Kinh doanh' },
    { key: 'b', label: 'Phòng Kỹ thuật', children: [{ key: 'b1', label: 'Nhóm Đo lường' }, { key: 'b2', label: 'Nhóm Bảo trì' }] },
  ],
}

describe('cây truy vấn nhóm', () => {
  it('cấp cha có trạng thái chọn một phần', () => {
    expect(checkState(tree, new Set(['a']))).toBe('partial')
    expect(checkState(tree, new Set(['a', 'b1', 'b2']))).toBe('checked')
    expect(checkState(tree, new Set())).toBe('unchecked')
  })
  it('bấm cha: chọn hết, bấm lần nữa: bỏ hết', () => {
    const all = toggleNode(tree, new Set(['a']))
    expect([...all].sort()).toEqual(['a', 'b1', 'b2'])
    expect([...toggleNode(tree, all)]).toEqual([])
  })
  it('tìm không dấu, giữ nút cha', () => {
    const r = filterTree([tree], 'bao tri')
    expect(r[0].children?.[0].children?.map((n) => n.key)).toEqual(['b2'])
  })
})
