import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LineItems from './LineItems.vue'

const columns = [
  { key: 'n', label: 'Tên hạng mục', required: true },
  { key: 'a', label: 'Sau thuế', align: 'right' as const, readonly: true },
]
const rows = [
  { name: '1', n: 'Thiết lập', a: '324.000.000' },
  { name: '2', n: 'Bản quyền', a: '440.000.000' },
]

describe('LineItems', () => {
  it('vẽ tiêu đề cột, dấu * cho cột bắt buộc, mỗi dòng một hàng', () => {
    const w = mount(LineItems, { props: { columns, rows }, slots: { 'cell-n': '<template #cell-n="{ row }">{{ row.n }}</template>' } })
    expect(w.findAll('[role=columnheader]').map((h) => h.text())).toContain('Tên hạng mục*')
    expect(w.findAll('.fn-lines-row')).toHaveLength(2)
    expect(w.text()).toContain('Bản quyền')
  })

  it('dòng Tổng theo key cột, nút thêm và xóa phát sự kiện', async () => {
    const w = mount(LineItems, { props: { columns, rows, addLabel: 'Thêm hạng mục', totals: { n: 'Tổng', a: '764.000.000' } } })
    expect(w.text()).toContain('764.000.000')
    await w.find('button[aria-label="Xóa dòng 2"]').trigger('click')
    expect(w.emitted('remove')?.[0]).toEqual([1])
    const add = w.findAll('button').find((b) => b.text().includes('Thêm hạng mục'))
    await add!.trigger('click')
    expect(w.emitted('add')).toHaveLength(1)
  })

  it('chỉ đọc: không có nút thêm và xóa; trống thì báo chưa có dòng', () => {
    const w = mount(LineItems, { props: { columns, rows: [], readonly: true, addLabel: 'Thêm hạng mục' } })
    expect(w.text()).toContain('Chưa có dòng nào.')
    expect(w.find('button').exists()).toBe(false)
  })
})
