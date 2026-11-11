import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.contract_tracker.doctype.payment_receipt.test_payment_receipt import (
	contract_amounts,
	make_receipt,
)
from contract_tracker.contract_tracker.doctype.sales_invoice_record.test_sales_invoice_record import (
	make_billing_contract,
	schedule_of,
)
from contract_tracker.tasks import daily


class TestTasks(IntegrationTestCase):
	def test_expire_active_contracts(self):
		doc = make_billing_contract(end_date="2027-12-31")
		license_ = schedule_of(doc.name, "Quý 1/2027")
		frappe.db.set_value("Contract", doc.name, "end_date", "2026-11-01")
		frappe.db.set_value("Payment Schedule", license_, "due_date", "2026-10-01")
		daily()
		self.assertEqual(frappe.db.get_value("Contract", doc.name, "status"), "Hết hạn")
		self.assertEqual(frappe.db.get_value("Payment Schedule", license_, "is_overdue"), 1)
		self.assertEqual(frappe.db.count("Payment Schedule", {"contract": doc.name}), 6)

	def test_skip_no_end_date_and_future(self):
		future = make_billing_contract()
		no_end = make_billing_contract()
		frappe.db.set_value("Contract", no_end.name, "end_date", None)
		daily()
		self.assertEqual(frappe.db.get_value("Contract", future.name, "status"), "Đang hiệu lực")
		self.assertEqual(frappe.db.get_value("Contract", no_end.name, "status"), "Đang hiệu lực")

	def test_overdue_flag_set_and_cleared(self):
		doc = make_billing_contract()
		name = schedule_of(doc.name, "Tạm ứng")
		frappe.db.set_value("Payment Schedule", name, "due_date", "2026-01-01")
		daily()
		self.assertEqual(frappe.db.get_value("Payment Schedule", name, "is_overdue"), 1)
		make_receipt(doc.customer, 33_000_000, [(name, 33_000_000)]).insert()
		frappe.db.set_value("Payment Schedule", name, "is_overdue", 1)
		daily()
		self.assertEqual(frappe.db.get_value("Payment Schedule", name, "is_overdue"), 0)

	def test_fix_stale_contract_amounts(self):
		doc = make_billing_contract()
		frappe.db.set_value("Contract", doc.name, "outstanding_amount", 0)
		daily()
		self.assertEqual(contract_amounts(doc.name).outstanding_amount, doc.total_after_tax)
