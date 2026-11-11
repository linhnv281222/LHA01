import frappe

from contract_tracker.setup import ensure_vat_rates


def execute():
	frappe.reload_doc("contract_tracker", "doctype", "vat_rate")
	ensure_vat_rates()
