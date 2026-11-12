from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase
from frappe.utils import add_days, getdate, today

from contract_tracker.contract_tracker.doctype.contract.contract import contract_amounts
from contract_tracker.contract_tracker.doctype.contract.test_contract import make_contract
from contract_tracker.contract_tracker.doctype.sales_invoice_record.test_sales_invoice_record import (
	make_billing_contract,
	make_invoice,
)
from contract_tracker.demo_data import CONTRACTS, DOCTYPES, MSG_NOT_STAGING, clear, seed
from contract_tracker.setup import ensure_vat_rates

STAGING = {"is_staging": 1}


def _count():
	return {dt: frappe.db.count(dt) for dt in DOCTYPES}


def _sample_names():
	return frappe.get_all("Contract", filters={"name": ["like", "MAU-%"]}, pluck="name")


class TestDemoDataGuard(IntegrationTestCase):
	def test_seed_requires_staging(self):
		ensure_vat_rates()
		before = _count()
		for conf in ({"is_staging": 0}, {}):
			with patch.dict(frappe.conf, conf):
				if not conf:
					frappe.conf.pop("is_staging", None)
				with self.assertRaises(frappe.ValidationError) as cm:
					seed()
			self.assertIn(MSG_NOT_STAGING, str(cm.exception))
		self.assertEqual(_count(), before)

	def test_clear_requires_staging(self):
		make_contract(contract_no="MAU-999").insert()
		before = _count()
		with patch.dict(frappe.conf, {"is_staging": 0}):
			with self.assertRaises(frappe.ValidationError) as cm:
				clear()
		self.assertIn(MSG_NOT_STAGING, str(cm.exception))
		self.assertTrue(frappe.db.exists("Contract", "MAU-999"))
		self.assertEqual(_count(), before)


class TestDemoDataSeed(IntegrationTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		with patch.dict(frappe.conf, STAGING):
			cls.result = seed()

	def _contracts(self, **filters):
		return frappe.get_all(
			"Contract",
			filters={"name": ["like", "MAU-%"], **filters},
			fields=["name", "status", "contract_type", "total_after_tax", "customer"],
		)

	def _items(self):
		return frappe.get_all(
			"Contract Item", filters={"parent": ["in", _sample_names()]}, fields=["billing_type", "vat_rate", "parent"]
		)

	def test_ten_contracts_by_status(self):
		self.assertEqual(len(self._contracts()), 10)
		for status, n in (("Đang hiệu lực", 5), ("Hết hạn", 2), ("Đã thanh lý", 3)):
			self.assertEqual(len(self._contracts(status=status)), n, status)

	def test_billing_types_and_vat(self):
		items = self._items()
		self.assertEqual({i.billing_type for i in items}, {"Một lần", "Nhiều đợt", "Định kỳ"})
		self.assertGreaterEqual(len({i.vat_rate for i in items}), 3)

	def test_four_contract_types(self):
		self.assertGreaterEqual(len({c.contract_type for c in self._contracts()}), 4)

	def test_items_and_schedules(self):
		for name in _sample_names():
			self.assertTrue(frappe.db.count("Contract Item", {"parent": name}), name)
			self.assertTrue(frappe.db.count("Payment Schedule", {"contract": name}), name)

	def test_documents_present(self):
		schedules = frappe.get_all(
			"Payment Schedule",
			filters={"contract": ["in", _sample_names()]},
			fields=["payment_status", "invoice_status", "request_status"],
		)
		states = {s.payment_status for s in schedules}
		self.assertIn("Đã thu", states)
		self.assertIn("Thu một phần", states)
		self.assertIn("Chưa xuất", {s.invoice_status for s in schedules})
		self.assertIn("Đã xuất", {s.invoice_status for s in schedules})
		self.assertIn("Đã lập", {s.request_status for s in schedules})
		names = frappe.get_all("Payment Schedule", filters={"contract": ["in", _sample_names()]}, pluck="name")

		def parents(child, parent, status=None):
			found = set(frappe.get_all(child, filters={"schedule": ["in", names]}, pluck="parent"))
			if status and found:
				found = set(
					frappe.get_all(parent, filters={"name": ["in", list(found)], "status": status}, pluck="name")
				)
			return found

		self.assertTrue(parents("Sales Invoice Record Item", "Sales Invoice Record"))
		self.assertTrue(parents("Payment Receipt Allocation", "Payment Receipt"))
		self.assertTrue(parents("Payment Request Item", "Payment Request", "Đã gửi"))
		self.assertTrue(parents("Payment Request Item", "Payment Request", "Nháp"))

	def test_liquidated(self):
		for spec in (s for s in CONTRACTS if s["status"] == "liquidated"):
			name = spec["no"]
			cutoff = getdate(add_days(today(), spec["cutoff"]))
			rows = frappe.get_all(
				"Payment Schedule",
				filters={"contract": name},
				fields=["period_from", "due_date", "invoice_status", "paid_amount", "request_status"],
			)
			self.assertTrue(any(r.invoice_status == "Đã xuất" for r in rows), name)
			self.assertTrue(any(r.paid_amount > 0 for r in rows), name)
			self.assertTrue(frappe.db.count("Payment Receipt Allocation", {"contract": name}), name)
			for r in rows:
				if getdate(r.period_from or r.due_date) > cutoff:
					self.assertTrue(
						r.invoice_status == "Đã xuất" or r.paid_amount > 0 or r.request_status == "Đã lập", name
					)

	def test_amounts_match(self):
		for c in _sample_names():
			total = frappe.db.get_value("Contract", c, "total_after_tax")
			expected = contract_amounts(c, total)
			actual = frappe.db.get_value("Contract", c, list(expected), as_dict=True)
			for key, value in expected.items():
				self.assertAlmostEqual(actual[key], value, msg=f"{c} {key}")

	def test_seed_twice_no_duplicates(self):
		before = _count()
		with patch.dict(frappe.conf, STAGING):
			result = seed()
		self.assertEqual(_count(), before)
		self.assertEqual(result["skipped"]["Contract"], 10)
		self.assertTrue(all(v == 0 for v in result["created"].values()))


class TestDemoDataClear(IntegrationTestCase):
	def test_clear_only_sample(self):
		real = make_billing_contract()
		schedule = frappe.get_all("Payment Schedule", filters={"contract": real.name}, pluck="name")[0]
		invoice = make_invoice(real.customer, [schedule]).insert()
		# Loại thật có mã giống tiền tố mẫu nếu "_" bị hiểu là ký tự đại diện của LIKE.
		lookalike = frappe.get_doc({"doctype": "Contract Type", "code": "MAUX1", "type_name": "Loại thật MAUX1"}).insert()
		real_types = frappe.get_all("Contract Type", pluck="name")
		real_customers = frappe.get_all("Contract Customer", pluck="name")
		base = _count()

		with patch.dict(frappe.conf, STAGING):
			seed()
			self.assertEqual(len(_sample_names()), 10)
			self.assertGreater(frappe.db.count("Payment Receipt"), base["Payment Receipt"])
			result = clear()

		self.assertEqual(result["deleted"]["Contract"], 10)
		self.assertEqual(_sample_names(), [])
		self.assertEqual(frappe.db.count("Payment Schedule", {"contract": ["like", "MAU-%"]}), 0)
		self.assertEqual(frappe.db.count("Contract Customer", {"tax_code": ["like", "MAU-KH-%"]}), 0)
		self.assertEqual([c for c in frappe.get_all("Contract Type", pluck="code") if c.startswith("MAU_")], [])
		# Mọi loại bản ghi về đúng số lượng trước khi nạp: dữ liệu thật còn nguyên.
		self.assertEqual(_count(), base)
		self.assertTrue(frappe.db.exists("Contract Type", lookalike.name))
		self.assertTrue(frappe.db.exists("Contract", real.name))
		self.assertTrue(frappe.db.exists("Sales Invoice Record", invoice.name))
		for name in real_types:
			self.assertTrue(frappe.db.exists("Contract Type", name))
		for name in real_customers:
			self.assertTrue(frappe.db.exists("Contract Customer", name))

	def test_not_in_patches(self):
		with open(frappe.get_app_path("contract_tracker", "patches.txt"), encoding="utf-8") as f:
			self.assertNotIn("demo_data", f.read())
