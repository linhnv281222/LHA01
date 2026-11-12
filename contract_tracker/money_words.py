# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt
"""Đọc số tiền VND thành chữ tiếng Việt (hàm thuần, không phụ thuộc Frappe)."""

DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
UNITS = ["", "nghìn", "triệu"]
BILLION = 1_000_000_000


def _read_group(n: int, first: bool) -> str:
	"""Đọc một nhóm 3 chữ số (n khác 0). `first` = nhóm đứng đầu của cả số."""
	hundreds, tens, ones = n // 100, (n // 10) % 10, n % 10
	parts = []
	if hundreds or not first:
		parts.append(f"{DIGITS[hundreds]} trăm")
	if tens == 1:
		parts.append("mười")
	elif tens >= 2:
		parts.append(f"{DIGITS[tens]} mươi")
	elif ones and (hundreds or not first):
		parts.append("linh")
	if ones:
		if ones == 1 and tens >= 2:
			parts.append("mốt")
		elif ones == 5 and tens >= 1:
			parts.append("lăm")
		else:
			parts.append(DIGITS[ones])
	return " ".join(parts)


def _read_below_billion(n: int, first: bool) -> str:
	groups = [(n // 1000**i) % 1000 for i in range(3)]
	words = []
	for i in (2, 1, 0):
		if not groups[i]:
			continue
		is_first = first and all(g == 0 for g in groups[i + 1 :])
		words.append(f"{_read_group(groups[i], is_first)} {UNITS[i]}".strip())
	return " ".join(words)


def _read(n: int, first: bool = True) -> str:
	if n < BILLION:
		return _read_below_billion(n, first)
	head = f"{_read(n // BILLION, first)} tỷ"
	rest = n % BILLION
	return f"{head} {_read_below_billion(rest, False)}" if rest else head


def vnd_in_words(amount) -> str:
	"""Số tiền bằng chữ: làm tròn về đồng, viết hoa chữ đầu, kết thúc "đồng". 48000000 → "Bốn mươi tám triệu đồng"."""
	value = int(round(float(amount or 0)))
	if value == 0:
		return "Không đồng"
	prefix = "âm " if value < 0 else ""
	text = prefix + _read(abs(value))
	return text[0].upper() + text[1:] + " đồng"
