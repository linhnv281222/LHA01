#!/usr/bin/env bash
# Kiểm tra toàn bộ app: giao diện Vue (chuẩn UI/UX, kiểu, test, build), rồi chép mã vào bench test,
# migrate, chạy toàn bộ test Python của app. Mã thoát khác 0 là thất bại. Chạy từ thư mục nào cũng được.
#
#   bash scripts/verify.sh            kiểm tra đầy đủ (bắt buộc trước khi báo xong)
#   bash scripts/verify.sh frontend   chỉ kiểm tra giao diện (nhanh, dùng khi đang sửa màn hình)
#
# Biến môi trường (có giá trị mặc định):
#   CREW_TEST_BENCH  thư mục bench test          (mặc định: $HOME/frappe/test-bench)
#   CREW_TEST_SITE   site dùng để chạy test      (mặc định: crew-test.localhost)
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_bench.sh"

BENCH_DIR="${CREW_TEST_BENCH:-$HOME/frappe/test-bench}"
SITE="${CREW_TEST_SITE:-crew-test.localhost}"
MODE="${1:-all}"

if [ -f "$REPO_ROOT/frontend/package.json" ]; then
  echo "==> [0/4] Giao diện: sinh kiểu từ DocType, chuẩn UI/UX, kiểu TypeScript, test, build"
  frontend_check
fi
if [ "$MODE" = "frontend" ]; then
  echo "==> OK: phần giao diện đạt (chưa chạy migrate và test Python)"
  exit 0
fi

require_bench "$BENCH_DIR"

exec 9>"$BENCH_DIR/.crew-verify.lock"
flock -w 1800 9 || { echo "Bench test đang bận quá lâu" >&2; exit 4; }

echo "==> [1/4] Kiểm tra cú pháp Python"
# Dùng đúng Python của bench (Frappe v16 cần 3.14). Chỉ phân tích cú pháp, không ghi file .pyc vào repo.
"$BENCH_DIR/env/bin/python" -I -c '
import ast, pathlib, sys
bad = 0
for p in sorted(pathlib.Path(sys.argv[1]).rglob("*.py")):
    try:
        ast.parse(p.read_text(encoding="utf-8"), str(p))
    except SyntaxError as e:
        print(f"{p}:{e.lineno}: {e.msg}", file=sys.stderr)
        bad += 1
sys.exit(1 if bad else 0)
' "$REPO_ROOT/$APP_NAME"

echo "==> [2/4] Chép mã app vào bench test"
ensure_redis "$BENCH_DIR"
sync_app "$BENCH_DIR"
ensure_assets_link "$BENCH_DIR"
cd "$BENCH_DIR"

echo "==> [3/4] Migrate site $SITE (đồng bộ DocType, chạy patch)"
bench --site "$SITE" migrate --skip-search-index
compile_translations_if_any "$BENCH_DIR"
build_assets_if_any "$BENCH_DIR"

echo "==> [4/4] Chạy test của app"
bench --site "$SITE" run-tests --app "$APP_NAME" --lightmode

echo "==> OK: verify thành công"
