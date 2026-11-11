// Sinh tự động bởi scripts/gen_doctype_types.py từ JSON của DocType. KHÔNG sửa tay;
// đổi DocType rồi chạy verify.sh là file này được sinh lại.

/** DocType "Contract Type" (contract_tracker/contract_tracker/doctype/contract_type/contract_type.json) */
export interface ContractType {
  name: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  docstatus?: 0 | 1 | 2
  /** Mã */
  code: string
  /** Tên loại hợp đồng */
  type_name: string
  /** Đang dùng */
  is_active?: 0 | 1
  /** Mô tả */
  description?: string | null
}
