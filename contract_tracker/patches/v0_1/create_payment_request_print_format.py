import frappe

from contract_tracker.setup import ensure_print_formats


def execute():
	frappe.reload_doc("contract_tracker", "doctype", "payment_request")
	ensure_print_formats()
