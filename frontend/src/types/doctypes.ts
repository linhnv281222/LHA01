// Sinh tự động bởi scripts/gen_doctype_types.py từ JSON của DocType. KHÔNG sửa tay;
// đổi DocType rồi chạy verify.sh là file này được sinh lại.

/** DocType "Contract Customer" (contract_tracker/contract_tracker/doctype/contract_customer/contract_customer.json) */
export interface ContractCustomer {
  name: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  docstatus?: 0 | 1 | 2
  /** Tên khách hàng */
  customer_name: string
  /** Mã số thuế */
  tax_code?: string | null
  /** Địa chỉ */
  address?: string | null
  /** Người liên hệ */
  contact_person?: string | null
  /** Chức vụ người đại diện */
  representative_title?: string | null
  /** Số điện thoại */
  phone?: string | null
  /** Email */
  email?: string | null
  /** Số tài khoản */
  bank_account?: string | null
  /** Ngân hàng */
  bank_name?: string | null
  /** Ghi chú */
  notes?: string | null
}

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

/** DocType "VAT Rate" (contract_tracker/contract_tracker/doctype/vat_rate/vat_rate.json) */
export interface VATRate {
  name: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  docstatus?: 0 | 1 | 2
  /** Tên thuế suất */
  rate_name: string
  /** Tỷ lệ (%) */
  rate: number
  /** Không chịu thuế */
  is_non_taxable?: 0 | 1
  /** Đang dùng */
  is_active?: 0 | 1
}
