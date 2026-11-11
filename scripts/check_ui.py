"""Kiểm tra tự động một phần chuẩn UI/UX trên mã giao diện (frontend/src), ngoài src/standard/.

Không thay được người duyệt, nhưng chặn sớm các lỗi hay gặp. In "file:dòng: [mã] lời nhắn" và thoát 1 nếu có lỗi.
Chạy: python3 scripts/check_ui.py
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "frontend" / "src"

# Thành phần frappe-ui đã có bản chuẩn thay thế trong src/standard.
REPLACED = {
	"TextInput": "FnField",
	"Textarea": "FnField type=\"textarea\"",
	"FormControl": "FnField",
	"Select": "FnField type=\"select\"",
	"Combobox": "FnField type=\"select\"",
	"DatePicker": "FnField type=\"date\"",
	"Checkbox": "FnField type=\"checkbox\"",
	"MultiSelect": "GroupTree hoặc FnField",
	"ListView": "DataTable",
}

ENGLISH_LABELS = r"Submit|OK|Ok|Save|Cancel|Delete|Edit|Add|Create|Update|Search|Close|Back|Next|Export|Yes|No"

RULES: list[tuple[str, re.Pattern, str]] = [
	("UI01", re.compile(r"<(input|select|textarea)\b"), "Không dùng ô nhập HTML thô; dùng FnField (nhãn, dấu *, báo lỗi, nút xóa)."),
	("UI02", re.compile(r"<table\b"), "Không tự vẽ bảng; dùng DataTable (danh sách) hoặc MiniTable (bảng phụ)."),
	(
		"UI03",
		re.compile(r"\b(bg|text|border|ring|fill|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b"),
		"Không dùng màu Tailwind thô; dùng token (text-ink-*, bg-surface-*, border-outline-*) hoặc lớp fn-*.",
	),
	("UI04", re.compile(r"#[0-9a-fA-F]{3,8}\b(?![\w-])"), "Không ghi mã màu trực tiếp; màu nằm trong tailwind.config.js và src/standard."),
	("UI05", re.compile(r"\b(window\.)?(alert|confirm|prompt)\s*\("), "Không dùng alert/confirm/prompt của trình duyệt; dùng dialog.confirm hoặc toast của frappe-ui."),
	(
		"UI06",
		re.compile(rf"""\blabel\s*=\s*["']({ENGLISH_LABELS})["']"""),
		"Nhãn nút phải là động từ tiếng Việt cụ thể (Lưu, Trình ký, Thêm hợp đồng…).",
	),
	("UI07", re.compile(r"\bstyle\s*=\s*\"[^\"]*(color|background)"), "Không đặt màu bằng style inline."),
	("UI08", re.compile(r"\bconsole\.log\("), "Bỏ console.log trước khi giao."),
]

IMPORT_RE = re.compile(r"import\s*\{([^}]*)\}\s*from\s*['\"]frappe-ui(?:/list|/experimental)?['\"]", re.S)


def check_file(path: pathlib.Path) -> list[str]:
	text = path.read_text(encoding="utf-8")
	rel = path.relative_to(ROOT)
	problems = []
	in_style = False
	for no, line in enumerate(text.splitlines(), 1):
		stripped = line.strip()
		if stripped.startswith("<style"):
			in_style = True
		if in_style:
			if stripped.startswith("</style>"):
				in_style = False
			# Trang không nên có CSS màu riêng.
			if re.search(r"#[0-9a-fA-F]{3,8}\b|rgb\(", line):
				problems.append(f"{rel}:{no}: [UI04] Không đặt màu trong <style> của trang; dùng token.")
			continue
		if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("<!--"):
			continue
		for code, rx, msg in RULES:
			if code in ("UI01", "UI02", "UI07") and path.suffix != ".vue":
				continue
			if rx.search(line):
				problems.append(f"{rel}:{no}: [{code}] {msg}")
	for m in IMPORT_RE.finditer(text):
		names = [n.strip().split(" as ")[0] for n in m.group(1).split(",") if n.strip()]
		for n in names:
			if n in REPLACED:
				no = text[: m.start()].count("\n") + 1
				problems.append(f"{rel}:{no}: [UI09] Không import {n} từ frappe-ui trong trang; dùng {REPLACED[n]} của src/standard.")
	return problems


def main() -> int:
	files = [
		p
		for p in sorted(SRC.rglob("*"))
		if p.suffix in (".vue", ".ts")
		and "standard" not in p.relative_to(SRC).parts
		and not p.name.endswith(".test.ts")
		and p.relative_to(SRC).parts[0] != "types"
		and p.name != "env.d.ts"
	]
	problems = [msg for p in files for msg in check_file(p)]
	if problems:
		print("Kiểm tra chuẩn UI/UX: có lỗi")
		print("\n".join(problems))
		return 1
	print(f"Kiểm tra chuẩn UI/UX: đạt ({len(files)} file)")
	return 0


if __name__ == "__main__":
	sys.exit(main())
