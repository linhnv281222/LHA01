import frappe

from contract_tracker.setup import ensure_print_formats


def execute():
	frappe.reload_doc("contract_tracker", "doctype", "acceptance_minutes_item")
	frappe.reload_doc("contract_tracker", "doctype", "acceptance_minutes")
	ensure_print_formats()
