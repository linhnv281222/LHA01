// Kiểu dữ liệu và quy tắc của menu chính: tối đa 9 mục cấp 1, tối đa 3 cấp.
// Danh sách mục nằm ở src/menu.ts (màn hình mới thêm mục vào đó).
export interface MenuItem {
  label: string
  /** Đường dẫn trong ứng dụng, ví dụ "/contract-types". Mục cha có children thì bỏ trống. */
  route?: string
  icon?: string
  children?: MenuItem[]
  /** Nhóm của mục cấp 1, ví dụ "Chứng từ": thanh menu hiện nhãn nhóm nhỏ và vạch ngăn trước mục đầu tiên của nhóm. */
  group?: string
}

export const MENU_MAX_TOP = 9
export const MENU_MAX_DEPTH = 3

export function menuDepth(items: MenuItem[]): number {
  if (!items.length) return 0
  return 1 + Math.max(...items.map((i) => menuDepth(i.children ?? [])))
}

/** Trả về danh sách vi phạm quy tắc menu (rỗng là hợp lệ). */
export function validateMenu(items: MenuItem[]): string[] {
  const errors: string[] = []
  if (items.length > MENU_MAX_TOP) errors.push(`Menu chính có ${items.length} mục, tối đa ${MENU_MAX_TOP}.`)
  const depth = menuDepth(items)
  if (depth > MENU_MAX_DEPTH) errors.push(`Menu sâu ${depth} cấp, tối đa ${MENU_MAX_DEPTH}.`)
  const walk = (list: MenuItem[]) => {
    for (const item of list) {
      if (!item.route && !item.children?.length) errors.push(`Mục "${item.label}" không có đường dẫn và không có mục con.`)
      if (item.children) walk(item.children)
    }
  }
  walk(items)
  return errors
}
