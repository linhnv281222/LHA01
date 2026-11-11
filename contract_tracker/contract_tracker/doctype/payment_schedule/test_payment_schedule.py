# Copyright (c) 2026, FaceNet and Contributors
# See license.txt

from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.contract_tracker.doctype.contract.contract import round_vnd
from contract_tracker.contract_tracker.doctype.contract.test_contract import (
	example_contract,
	item_multi,
	item_one_time,
	item_recurring,
	make_contract,
	milestones_30_70,
)
from contract_tracker.tests.test_setup import VIEWER, make_user

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []

DT = "Payment Schedule"


def schedules(contract, **filters):
	return frappe.get_all(
		DT,
		filters={"contract": contract, **filters},
		fields=["*"],
		order_by="due_date asc, schedule_name asc",
	)


def active(doc):
	doc.insert()
	doc.activate()
	return frappe.get_doc("Contract", doc.name)


class TestPaymentSchedule(IntegrationTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")

	def test_draft_has_no_schedules(self):
		doc = example_contract().insert()
		self.assertEqual(schedules(doc.name), [])

	def test_activate_generates(self):
		doc = active(example_contract())
		self.assertEqual(doc.status, "Đang hiệu lực")
		self.assertEqual(len(schedules(doc.name)), 7)

	def test_example_hd001(self):
		doc = active(_hd001())
		rows = schedules(doc.name)
		training = [r for r in rows if r.item_name == "Triển khai"]
		self.assertEqual(sorted(r.total_amount for r in training), [33_000_000, 77_000_000])
		license_rows = [r for r in rows if r.item_name == "License"]
		self.assertEqual(
			[r.schedule_name for r in license_rows], [f"Quý {i}/2027" for i in range(1, 5)]
		)
		self.assertEqual(
			[str(r.due_date) for r in license_rows],
			["2027-01-16", "2027-04-16", "2027-07-16", "2027-10-16"],
		)
		self.assertTrue(all(r.total_amount == 15_000_000 for r in license_rows))
		self.assertEqual([r.total_amount for r in rows if r.item_name == "Đào tạo"], [5_400_000])

	def test_example_total_matches_contract(self):
		doc = active(_hd001())
		total = sum(r.total_amount for r in schedules(doc.name))
		self.assertEqual(total, 175_400_000)
		self.assertEqual(total, doc.total_after_tax)

	def test_recurring_partial_last_period(self):
		doc = active(
			make_contract(
				end_date="2027-05-15",
				items=[item_recurring(unit_price=9_000_000, period_end="2027-05-15")],
			)
		)
		self.assertEqual([r.amount_before_tax for r in schedules(doc.name)], [9_000_000, 4_450_549])

	def test_bill_end_of_period(self):
		doc = active(make_contract(items=[item_recurring(bill_timing="Cuối kỳ", credit_days=10)]))
		rows = schedules(doc.name)
		self.assertEqual(str(rows[0].period_to), "2027-03-31")
		self.assertEqual(str(rows[0].due_date), "2027-04-10")

	def test_day_period(self):
		doc = active(
			make_contract(
				end_date="2027-02-10",
				items=[
					item_recurring(
						period="Ngày", period_days=15, period_end="2027-02-10", bill_timing="Cuối kỳ", credit_days=5
					)
				],
			)
		)
		rows = schedules(doc.name)
		self.assertEqual(len(rows), 3)
		self.assertEqual(
			[(str(r.period_from), str(r.period_to)) for r in rows],
			[("2027-01-01", "2027-01-15"), ("2027-01-16", "2027-01-30"), ("2027-01-31", "2027-02-10")],
		)
		self.assertEqual(rows[0].schedule_name, "License từ 01/01/2027 đến 15/01/2027")
		self.assertEqual([str(r.due_date) for r in rows], ["2027-01-20", "2027-02-04", "2027-02-15"])
		self.assertEqual(rows[2].amount_before_tax, round_vnd(15_000_000 * 11 / 15))
		self.assertEqual(sum(r.amount_before_tax for r in rows), doc.items[0].amount_before_tax)

	def test_day_period_start_of_period_due(self):
		doc = active(
			make_contract(
				end_date="2027-01-20",
				items=[item_recurring(period="Ngày", period_days=15, period_end="2027-01-20", credit_days=3)],
			)
		)
		self.assertEqual([str(r.due_date) for r in schedules(doc.name)], ["2027-01-04", "2027-01-19"])

	def test_period_days_required_and_positive(self):
		for value in (None, 0, -1):
			doc = make_contract(items=[item_recurring(period="Ngày", period_days=value)])
			with self.assertRaises(frappe.ValidationError) as cm:
				doc.insert()
			self.assertIn("số ngày mỗi kỳ", str(cm.exception), msg=str(value))
		doc = make_contract(items=[item_recurring(period="Quý", period_days=-5)]).insert()
		self.assertFalse(doc.items[0].period_days)

	def test_multi_percent_rounding(self):
		item = item_multi(item_value=100_000_001)
		doc = active(
			make_contract(
				items=[item],
				milestones=[
					{"item_key": "K-TRIENKHAI", "milestone_name": "Đợt 1", "percent": 33.33, "due_date": "2027-01-15"},
					{"item_key": "K-TRIENKHAI", "milestone_name": "Đợt 2", "percent": 33.33, "due_date": "2027-02-15"},
					{"item_key": "K-TRIENKHAI", "milestone_name": "Đợt 3", "percent": 33.34, "due_date": "2027-03-15"},
				],
			)
		)
		rows = schedules(doc.name)
		self.assertEqual(len(rows), 3)
		self.assertEqual(sum(r.amount_before_tax for r in rows), 100_000_001)
		self.assertEqual(rows[0].amount_before_tax, round_vnd(100_000_001 * 33.33 / 100))

	def test_edit_active_regenerates(self):
		doc = active(example_contract())
		doc.items[2].amount = 6_000_000
		doc.append("items", item_one_time(item_name="Bảo trì", amount=1_000_000, vat_rate="10%"))
		doc.save()
		rows = schedules(doc.name)
		self.assertEqual(len(rows), 8)
		self.assertEqual([r.total_amount for r in rows if r.item_name == "Đào tạo"], [6_480_000])
		self.assertEqual([r.total_amount for r in rows if r.item_name == "Bảo trì"], [1_100_000])

	def test_billed_schedule_kept(self):
		doc = active(example_contract())
		first = next(r for r in schedules(doc.name) if r.schedule_name == "Quý 1/2027")

		def fake(row):
			return row.name == first.name

		with patch(
			"contract_tracker.contract_tracker.doctype.payment_schedule.payment_schedule.has_documents",
			side_effect=fake,
		):
			doc = frappe.get_doc("Contract", doc.name)
			license_item = next(i for i in doc.items if i.item_name == "License")
			license_item.unit_price = 20_000_000
			doc.save()
			quarter1 = [r for r in schedules(doc.name) if r.schedule_name == "Quý 1/2027"]
			self.assertEqual(len(quarter1), 1)
			self.assertEqual(quarter1[0].name, first.name)
			self.assertEqual(quarter1[0].total_amount, 15_000_000)
			self.assertEqual(
				[r.total_amount for r in schedules(doc.name) if r.item_name == "License" and r.name != first.name],
				[20_000_000] * 3,
			)
			doc = frappe.get_doc("Contract", doc.name)
			doc.items = [i for i in doc.items if i.item_name != "License"]
			doc.save()
			remaining = [r for r in schedules(doc.name) if r.item_name == "License"]
			self.assertEqual([r.name for r in remaining], [first.name])

	def test_cancel_deletes_unbilled(self):
		doc = active(example_contract())
		doc.cancel_contract()
		self.assertEqual(schedules(doc.name), [])

	def test_liquidate_keeps_schedules(self):
		doc = active(example_contract())
		doc.liquidate()
		self.assertEqual(len(schedules(doc.name)), 7)

	def test_viewer_cannot_modify(self):
		doc = active(example_contract())
		name = schedules(doc.name)[0].name
		viewer = make_user("xem.dot.thu@example.com", VIEWER)
		frappe.set_user(viewer)
		self.assertTrue(frappe.has_permission(DT, "read", doc=name))
		for ptype in ("write", "delete", "create"):
			self.assertFalse(frappe.has_permission(DT, ptype, doc=name if ptype != "create" else None), ptype)
		with self.assertRaises(frappe.PermissionError):
			frappe.get_doc(DT, name).save()
		with self.assertRaises(frappe.PermissionError):
			frappe.delete_doc(DT, name)

	def test_activate_error_rolls_back(self):
		doc = example_contract().insert()
		with patch(
			"contract_tracker.contract_tracker.doctype.payment_schedule.payment_schedule.build_schedules",
			side_effect=frappe.ValidationError("lỗi giả"),
		):
			with self.assertRaises(frappe.ValidationError):
				doc.activate()
		doc.reload()
		self.assertEqual(doc.status, "Nháp")


def _hd001():
	return make_contract(
		items=[item_multi(), item_recurring(credit_days=15), item_one_time()],
		milestones=milestones_30_70(),
	)
