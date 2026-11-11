import frappe

from contract_tracker.contract_tracker.doctype.payment_schedule.payment_schedule import sync_responsible_user


def execute():
	"""Điền người phụ trách (từ hợp đồng) cho các đợt thu đã sinh trước khi có trường này."""
	frappe.reload_doc("contract_tracker", "doctype", "payment_schedule")
	for contract in frappe.get_all("Contract", fields=["name", "responsible_user"]):
		sync_responsible_user(contract.name, contract.responsible_user)
