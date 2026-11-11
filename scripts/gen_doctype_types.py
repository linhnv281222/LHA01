"""Sinh frontend/src/types/doctypes.ts từ file JSON của các DocType trong app.

verify.sh chạy script này trước khi kiểm tra kiểu, nên interface TypeScript luôn khớp DocType.
Chạy: python3 scripts/gen_doctype_types.py   (không cần bench)
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = "contract_tracker"
OUT = ROOT / "frontend" / "src" / "types" / "doctypes.ts"

STRING_TYPES = {
	"Data", "Small Text", "Text", "Long Text", "Text Editor", "Markdown Editor", "HTML Editor", "Code",
	"Link", "Dynamic Link", "Attach", "Attach Image", "Signature", "Color", "Barcode", "Geolocation",
	"Password", "Read Only", "Autocomplete", "JSON", "Icon", "Phone", "Rating", "Duration",
	"Date", "Datetime", "Time",
}
NUMBER_TYPES = {"Int", "Float", "Currency", "Percent"}
SKIP_TYPES = {"Section Break", "Column Break", "Tab Break", "HTML", "Button", "Heading", "Fold", "Image"}


def iface_name(doctype: str) -> str:
	return "".join(ch for ch in doctype if ch.isalnum())


def ts_type(field: dict) -> str | None:
	ft = field.get("fieldtype", "Data")
	if ft in SKIP_TYPES:
		return None
	if ft == "Check":
		return "0 | 1"
	if ft in NUMBER_TYPES:
		return "number"
	if ft == "Select":
		opts = [o for o in (field.get("options") or "").split("\n") if o.strip()]
		return " | ".join(json.dumps(o) for o in opts) if opts else "string"
	if ft in ("Table", "Table MultiSelect"):
		return f"{iface_name(field.get('options', ''))}[]"
	if ft in STRING_TYPES:
		return "string"
	return "unknown"


def main() -> int:
	files = sorted(ROOT.glob(f"{APP}/*/doctype/*/*.json"))
	blocks = []
	for path in files:
		data = json.loads(path.read_text(encoding="utf-8"))
		if data.get("doctype") != "DocType":
			continue
		name = data["name"]
		lines = [f"/** DocType \"{name}\" ({path.relative_to(ROOT)}) */", f"export interface {iface_name(name)} {{"]
		lines += [
			"  name: string",
			"  owner?: string",
			"  creation?: string",
			"  modified?: string",
			"  modified_by?: string",
			"  docstatus?: 0 | 1 | 2",
		]
		if data.get("istable"):
			lines += ["  parent?: string", "  parentfield?: string", "  parenttype?: string", "  idx?: number"]
		for field in data.get("fields", []):
			t = ts_type(field)
			if t is None:
				continue
			label = field.get("label") or field["fieldname"]
			optional = "" if field.get("reqd") else "?"
			nullable = "" if field.get("reqd") or field.get("fieldtype") == "Check" else " | null"
			lines.append(f"  /** {label} */")
			lines.append(f"  {field['fieldname']}{optional}: {t}{nullable}")
		lines.append("}")
		blocks.append("\n".join(lines))

	content = (
		"// Sinh tự động bởi scripts/gen_doctype_types.py từ JSON của DocType. KHÔNG sửa tay;\n"
		"// đổi DocType rồi chạy verify.sh là file này được sinh lại.\n\n" + "\n\n".join(blocks) + "\n"
	)
	OUT.parent.mkdir(parents=True, exist_ok=True)
	old = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
	if old != content:
		OUT.write_text(content, encoding="utf-8")
		print(f"Đã cập nhật {OUT.relative_to(ROOT)} ({len(blocks)} DocType)")
	else:
		print(f"{OUT.relative_to(ROOT)} đã khớp DocType ({len(blocks)} DocType)")
	return 0


if __name__ == "__main__":
	sys.exit(main())
