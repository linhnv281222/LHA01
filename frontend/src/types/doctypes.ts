// Sinh tự động bởi scripts/gen_doctype_types.py từ JSON của DocType. KHÔNG sửa tay;
// đổi DocType rồi chạy verify.sh là file này được sinh lại.

/** DocType "Contract" (contract_tracker/contract_tracker/doctype/contract/contract.json) */
export interface Contract {
  name: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  docstatus?: 0 | 1 | 2
  /** Số hợp đồng */
  contract_no: string
  /** Khách hàng */
  customer: string
  /** Tên khách hàng */
  customer_name?: string | null
  /** Loại hợp đồng */
  contract_type?: string | null
  /** Tên loại hợp đồng */
  contract_type_name?: string | null
  /** Tên/nội dung hợp đồng */
  contract_title?: string | null
  /** Người phụ trách */
  responsible_user?: string | null
  /** Tên người phụ trách */
  responsible_name?: string | null
  /** Trạng thái */
  status?: "Nh\u00e1p" | "\u0110ang hi\u1ec7u l\u1ef1c" | "H\u1ebft h\u1ea1n" | "\u0110\u00e3 thanh l\u00fd" | "\u0110\u00e3 h\u1ee7y" | null
  /** Ngày ký */
  signed_date?: string | null
  /** Ngày bắt đầu hiệu lực */
  start_date: string
  /** Ngày kết thúc */
  end_date?: string | null
  /** Hạng mục */
  items?: ContractItem[] | null
  /** Mốc thanh toán */
  milestones?: ContractMilestone[] | null
  /** Giá trị trước thuế (VND) */
  total_before_tax?: number | null
  /** Tiền thuế (VND) */
  total_tax?: number | null
  /** Tổng sau thuế (VND) */
  total_after_tax?: number | null
  /** Đã xuất hóa đơn (VND) */
  invoiced_amount?: number | null
  /** Đã thu (VND) */
  paid_amount?: number | null
  /** Còn phải thu (VND) */
  outstanding_amount?: number | null
  /** File hợp đồng */
  contract_file?: string | null
  /** Ghi chú */
  notes?: string | null
}

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

/** DocType "Contract Item" (contract_tracker/contract_tracker/doctype/contract_item/contract_item.json) */
export interface ContractItem {
  name: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  docstatus?: 0 | 1 | 2
  parent?: string
  parentfield?: string
  parenttype?: string
  idx?: number
  /** Mã hạng mục */
  item_key?: string | null
  /** Tên hạng mục */
  item_name: string
  /** Thuế suất */
  vat_rate: string
  /** Kiểu thu */
  billing_type: "M\u1ed9t l\u1ea7n" | "Nhi\u1ec1u \u0111\u1ee3t" | "\u0110\u1ecbnh k\u1ef3"
  /** Cần nghiệm thu */
  requires_acceptance?: 0 | 1
  /** Trước thuế (VND) */
  amount_before_tax?: number | null
  /** Tiền thuế (VND) */
  tax_amount?: number | null
  /** Số tiền trước thuế (VND) */
  amount?: number | null
  /** Ngày đến hạn */
  due_date?: string | null
  /** Giá trị hạng mục trước thuế (VND) */
  item_value?: number | null
  /** Cách nhập mốc */
  milestone_input?: "S\u1ed1 ti\u1ec1n" | "Ph\u1ea7n tr\u0103m" | null
  /** Đơn giá mỗi kỳ trước thuế (VND) */
  unit_price?: number | null
  /** Chu kỳ */
  period?: "Th\u00e1ng" | "Qu\u00fd" | "6 th\u00e1ng" | "N\u0103m" | null
  /** Ngày bắt đầu kỳ đầu */
  period_start?: string | null
  /** Ngày kết thúc */
  period_end?: string | null
  /** Thu đầu kỳ / cuối kỳ */
  bill_timing?: "\u0110\u1ea7u k\u1ef3" | "Cu\u1ed1i k\u1ef3" | null
  /** Số ngày được nợ */
  credit_days?: number | null
}

/** DocType "Contract Milestone" (contract_tracker/contract_tracker/doctype/contract_milestone/contract_milestone.json) */
export interface ContractMilestone {
  name: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  docstatus?: 0 | 1 | 2
  parent?: string
  parentfield?: string
  parenttype?: string
  idx?: number
  /** Mã hạng mục */
  item_key: string
  /** Tên mốc */
  milestone_name: string
  /** Số tiền (VND) */
  amount?: number | null
  /** Phần trăm (%) */
  percent?: number | null
  /** Ngày đến hạn */
  due_date: string
  /** Cần nghiệm thu */
  requires_acceptance?: 0 | 1
  /** Số tiền quy đổi (VND) */
  milestone_amount?: number | null
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
