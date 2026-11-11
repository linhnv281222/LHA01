import { describe, expect, it } from 'vitest'
import { validateMenu } from './menu'
import { MENU } from '@/menu'

describe('menu chính', () => {
  it('menu của ứng dụng đúng quy tắc: ≤ 9 mục cấp 1, ≤ 3 cấp, mục nào cũng có đích', () => {
    expect(validateMenu(MENU)).toEqual([])
  })
  it('phát hiện menu quá dài hoặc quá sâu', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ label: `M${i}`, route: `/m${i}` }))
    expect(validateMenu(many)[0]).toContain('tối đa 9')
    const deep = [{ label: 'a', children: [{ label: 'b', children: [{ label: 'c', children: [{ label: 'd', route: '/d' }] }] }] }]
    expect(validateMenu(deep).join(' ')).toContain('tối đa 3')
  })
})
