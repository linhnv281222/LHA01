// Sinh tự động bởi scripts/gen_doctype_types.py từ JSON của DocType. KHÔNG sửa tay;
// đổi DocType rồi chạy verify.sh là file này được sinh lại.

/** DocType "Acceptance Minutes" (contract_tracker/contract_tracker/doctype/acceptance_minutes/acceptance_minutes.json) */
export interface AcceptanceMinutes {
  name: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  docstatus?: 0 | 1 | 2
  /** Khách hàng */
  customer: string
  /** Tên khách hàng */
  customer_name?: string | null
  /** Ngày nghiệm thu */
  minutes_date: string
  /** Trạng thái */
  status?: "Nh\u00e1p" | "\u0110\u00e3 k\u00fd" | null
  /** Ghi chú */
  notes?: string | null
  /** Các đợt thu */
  items: AcceptanceMinutesItem[]
  /** Số đợt */
  schedule_count?: number | null
  /** Tổng trước thuế (VND) */
  total_before_tax?: number | null
  /** Tổng thuế (VND) */
  total_tax?: number | null
  /** Tổng cộng (VND) */
  grand_total?: number | null
  /** Nội dung nghiệm thu */
  content?: string | null
  /** Đại diện bên A */
  party_a_rep?: string | null
  /** Đại diện bên B */
  party_b_rep?: string | null
  /** File scan biên bản đã ký */
  scan_file?: string | null
}

/** DocType "Acceptance Minutes Item" (contract_tracker/contract_tracker/doctype/acceptance_minutes_item/acceptance_minutes_item.json) */
export interface AcceptanceMinutesItem {
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
  /** Đợt thu */
  schedule: string
  /** Hợp đồng */
  contract?: string | null
  /** Tên đợt */
  schedule_name?: string | null
  /** Hạng mục */
  item_name?: string | null
  /** Kỳ từ */
  period_from?: string | null
  /** Kỳ đến */
  period_to?: string | null
  /** Ngày đến hạn */
  due_date?: string | null
  /** Trước thuế (VND) */
  amount_before_tax?: number | null
  /** Tiền thuế (VND) */
  tax_amount?: number | null
  /** Tổng tiền (VND) */
  total_amount?: number | null
}

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
  period?: "Th\u00e1ng" | "Qu\u00fd" | "6 th\u00e1ng" | "N\u0103m" | "Ng\u00e0y" | null
  /** Số ngày mỗi kỳ */
  period_days?: number | null
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

/** DocType "Contract Tracker Settings" (contract_tracker/contract_tracker/doctype/contract_tracker_settings/contract_tracker_settings.json) */
export interface ContractTrackerSettings {
  name: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  docstatus?: 0 | 1 | 2
  /** Chủ tài khoản */
  bank_account_holder?: string | null
  /** Số tài khoản */
  bank_account_no?: string | null
  /** Ngân hàng */
  bank_name?: string | null
  /** Chi nhánh */
  bank_branch?: string | null
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

/** DocType "Payment Receipt" (contract_tracker/contract_tracker/doctype/payment_receipt/payment_receipt.json) */
export interface PaymentReceipt {
  name: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  docstatus?: 0 | 1 | 2
  /** Khách hàng */
  customer: string
  /** Tên khách hàng */
  customer_name?: string | null
  /** Ngày thu */
  receipt_date: string
  /** Số tiền (VND) */
  amount: number
  /** Hình thức */
  method: "Chuy\u1ec3n kho\u1ea3n" | "Ti\u1ec1n m\u1eb7t"
  /** Ghi chú */
  notes?: string | null
  /** Phân bổ */
  allocations?: PaymentReceiptAllocation[] | null
  /** Đã phân bổ (VND) */
  allocated_total?: number | null
  /** Chưa phân bổ (VND) */
  unallocated_amount?: number | null
}

/** DocType "Payment Receipt Allocation" (contract_tracker/contract_tracker/doctype/payment_receipt_allocation/payment_receipt_allocation.json) */
export interface PaymentReceiptAllocation {
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
  /** Đợt thu */
  schedule: string
  /** Số phân bổ (VND) */
  allocated_amount: number
  /** Tên đợt */
  schedule_name?: string | null
  /** Hợp đồng */
  contract?: string | null
  /** Ngày đến hạn */
  due_date?: string | null
  /** Tổng tiền đợt (VND) */
  total_amount?: number | null
  /** Còn nợ (VND) */
  outstanding_amount?: number | null
}

/** DocType "Payment Request" (contract_tracker/contract_tracker/doctype/payment_request/payment_request.json) */
export interface PaymentRequest {
  name: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  docstatus?: 0 | 1 | 2
  /** Khách hàng */
  customer: string
  /** Tên khách hàng */
  customer_name?: string | null
  /** Ngày lập */
  request_date: string
  /** Hạn thanh toán */
  due_date: string
  /** Trạng thái */
  status?: "Nh\u00e1p" | "\u0110\u00e3 g\u1eedi" | null
  /** Ghi chú */
  notes?: string | null
  /** Các đợt thu */
  items: PaymentRequestItem[]
  /** Tổng trước thuế (VND) */
  total_before_tax?: number | null
  /** Tổng thuế (VND) */
  total_tax?: number | null
  /** Tổng cộng (VND) */
  grand_total?: number | null
  /** Số tiền bằng chữ */
  amount_in_words?: string | null
  /** Chủ tài khoản */
  bank_account_holder?: string | null
  /** Số tài khoản */
  bank_account_no?: string | null
  /** Ngân hàng */
  bank_name?: string | null
  /** Chi nhánh */
  bank_branch?: string | null
}

/** DocType "Payment Request Item" (contract_tracker/contract_tracker/doctype/payment_request_item/payment_request_item.json) */
export interface PaymentRequestItem {
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
  /** Đợt thu */
  schedule: string
  /** Hợp đồng */
  contract?: string | null
  /** Nội dung */
  schedule_name?: string | null
  /** Ngày đến hạn */
  due_date?: string | null
  /** Trước thuế (VND) */
  amount_before_tax?: number | null
  /** Thuế suất */
  vat_rate?: string | null
  /** Tiền thuế (VND) */
  tax_amount?: number | null
  /** Tổng tiền (VND) */
  total_amount?: number | null
  /** Còn nợ (VND) */
  outstanding?: number | null
}

/** DocType "Payment Schedule" (contract_tracker/contract_tracker/doctype/payment_schedule/payment_schedule.json) */
export interface PaymentSchedule {
  name: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  docstatus?: 0 | 1 | 2
  /** Hợp đồng */
  contract: string
  /** Khách hàng */
  customer?: string | null
  /** Tên khách hàng */
  customer_name?: string | null
  /** Người phụ trách */
  responsible_user?: string | null
  /** Mã hạng mục */
  item_key?: string | null
  /** Hạng mục */
  item_name?: string | null
  /** Tên đợt */
  schedule_name?: string | null
  /** Kỳ từ */
  period_from?: string | null
  /** Kỳ đến */
  period_to?: string | null
  /** Ngày đến hạn */
  due_date?: string | null
  /** Trước thuế (VND) */
  amount_before_tax?: number | null
  /** Thuế suất */
  vat_rate?: string | null
  /** Tiền thuế (VND) */
  tax_amount?: number | null
  /** Tổng tiền (VND) */
  total_amount?: number | null
  /** Cần nghiệm thu */
  requires_acceptance?: 0 | 1
  /** Nghiệm thu */
  acceptance_status?: "Kh\u00f4ng c\u1ea7n" | "Ch\u01b0a" | "\u0110\u00e3 k\u00fd" | null
  /** Đề nghị thanh toán */
  request_status?: "Ch\u01b0a l\u1eadp" | "\u0110\u00e3 l\u1eadp" | null
  /** Hóa đơn */
  invoice_status?: "Ch\u01b0a xu\u1ea5t" | "\u0110\u00e3 xu\u1ea5t" | null
  /** Số hóa đơn */
  invoice_no?: string | null
  /** Thanh toán */
  payment_status?: "Ch\u01b0a thu" | "Thu m\u1ed9t ph\u1ea7n" | "\u0110\u00e3 thu" | null
  /** Số tiền đã thu (VND) */
  paid_amount?: number | null
  /** Quá hạn */
  is_overdue?: 0 | 1
}

/** DocType "Sales Invoice Record" (contract_tracker/contract_tracker/doctype/sales_invoice_record/sales_invoice_record.json) */
export interface SalesInvoiceRecord {
  name: string
  owner?: string
  creation?: string
  modified?: string
  modified_by?: string
  docstatus?: 0 | 1 | 2
  /** Khách hàng */
  customer: string
  /** Tên khách hàng */
  customer_name?: string | null
  /** Số hóa đơn */
  invoice_no: string
  /** Ký hiệu */
  invoice_series?: string | null
  /** Ngày xuất */
  invoice_date: string
  /** Trạng thái */
  status?: "Hi\u1ec7u l\u1ef1c" | "\u0110\u00e3 h\u1ee7y" | null
  /** Ghi chú */
  notes?: string | null
  /** Các đợt thu */
  items: SalesInvoiceRecordItem[]
  /** Tổng trước thuế (VND) */
  total_before_tax?: number | null
  /** Tổng thuế (VND) */
  total_tax?: number | null
  /** Tổng cộng (VND) */
  grand_total?: number | null
  /** Theo thuế suất */
  tax_breakdown?: SalesInvoiceTaxRow[] | null
}

/** DocType "Sales Invoice Record Item" (contract_tracker/contract_tracker/doctype/sales_invoice_record_item/sales_invoice_record_item.json) */
export interface SalesInvoiceRecordItem {
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
  /** Đợt thu */
  schedule: string
  /** Hợp đồng */
  contract?: string | null
  /** Tên đợt */
  schedule_name?: string | null
  /** Ngày đến hạn */
  due_date?: string | null
  /** Trước thuế (VND) */
  amount_before_tax?: number | null
  /** Thuế suất */
  vat_rate?: string | null
  /** Tiền thuế (VND) */
  tax_amount?: number | null
  /** Tổng tiền (VND) */
  total_amount?: number | null
}

/** DocType "Sales Invoice Tax Row" (contract_tracker/contract_tracker/doctype/sales_invoice_tax_row/sales_invoice_tax_row.json) */
export interface SalesInvoiceTaxRow {
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
  /** Thuế suất */
  vat_rate?: string | null
  /** Trước thuế (VND) */
  amount_before_tax?: number | null
  /** Tiền thuế (VND) */
  tax_amount?: number | null
  /** Tổng tiền (VND) */
  total_amount?: number | null
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
