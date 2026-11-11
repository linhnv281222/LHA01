// Logic cây chọn nhóm (panel trái): chọn nhiều, cấp cha hiện trạng thái chọn một phần, lọc theo chữ.
import { normalizeText } from './table'

export interface TreeNode {
  key: string
  label: string
  /** Icon lucide của nút, ví dụ "lucide-folder". Không có thì dùng icon theo cấp. */
  icon?: string
  count?: number
  children?: TreeNode[]
}

export function leafKeys(node: TreeNode): string[] {
  if (!node.children?.length) return [node.key]
  return node.children.flatMap(leafKeys)
}

export type CheckState = 'checked' | 'unchecked' | 'partial'

export function checkState(node: TreeNode, checked: Set<string>): CheckState {
  const leaves = leafKeys(node)
  const n = leaves.filter((k) => checked.has(k)).length
  if (n === 0) return 'unchecked'
  return n === leaves.length ? 'checked' : 'partial'
}

/** Bấm vào một nút: nếu đang chọn đủ thì bỏ hết lá bên dưới, ngược lại chọn hết. */
export function toggleNode(node: TreeNode, checked: Set<string>): Set<string> {
  const next = new Set(checked)
  const leaves = leafKeys(node)
  if (checkState(node, checked) === 'checked') leaves.forEach((k) => next.delete(k))
  else leaves.forEach((k) => next.add(k))
  return next
}

/** Giữ các nút khớp chữ tìm kiếm (bỏ dấu) và tổ tiên của chúng. */
export function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const q = normalizeText(query)
  if (!q) return nodes
  const walk = (list: TreeNode[]): TreeNode[] =>
    list.flatMap((n) => {
      if (normalizeText(n.label).includes(q)) return [n]
      const kids = walk(n.children ?? [])
      return kids.length ? [{ ...n, children: kids }] : []
    })
  return walk(nodes)
}
