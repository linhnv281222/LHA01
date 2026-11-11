# Lọc địa chỉ chuyển trang sau đăng nhập. Quy tắc phải khớp với safeRedirect trong frontend/src/pages/login/login.ts.
from urllib.parse import unquote

DEFAULT_REDIRECT = "/contracts"


def safe_redirect(target: str | None, default: str = DEFAULT_REDIRECT) -> str:
	"""Chỉ nhận đường dẫn nội bộ; mọi trường hợp khác trả về `default`."""
	if not target:
		return default
	value = unquote(str(target)).strip()
	if not value.startswith("/") or value.startswith("//") or value.startswith("/\\"):
		return default
	if "://" in value or "\\" in value or any(ord(c) < 32 for c in value):
		return default
	path = value.split("?", 1)[0].split("#", 1)[0].rstrip("/")
	if path == "/login":
		return default
	return value
