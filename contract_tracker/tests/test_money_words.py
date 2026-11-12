from frappe.tests import UnitTestCase

from contract_tracker.money_words import vnd_in_words


class TestMoneyWords(UnitTestCase):
	def test_cases(self):
		cases = {
			0: "Không đồng",
			1: "Một đồng",
			14: "Mười bốn đồng",
			15: "Mười lăm đồng",
			21: "Hai mươi mốt đồng",
			25: "Hai mươi lăm đồng",
			105: "Một trăm linh năm đồng",
			1_005_000: "Một triệu không trăm linh năm nghìn đồng",
			33_000_000: "Ba mươi ba triệu đồng",
			48_000_000: "Bốn mươi tám triệu đồng",
			1_234_567: "Một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy đồng",
			1_000_000_000: "Một tỷ đồng",
			1_000_000_005: "Một tỷ không trăm linh năm đồng",
			1_000_000_000_000: "Một nghìn tỷ đồng",
		}
		for amount, words in cases.items():
			self.assertEqual(vnd_in_words(amount), words, amount)

	def test_decimals_rounded(self):
		self.assertEqual(vnd_in_words(14.6), "Mười lăm đồng")
		self.assertEqual(vnd_in_words("48000000.4"), "Bốn mươi tám triệu đồng")
		self.assertEqual(vnd_in_words(None), "Không đồng")
