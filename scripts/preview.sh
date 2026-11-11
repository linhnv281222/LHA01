#!/usr/bin/env bash
# Dựng bản chạy thử: chép mã vào bench preview, migrate, rồi chạy web server ở foreground.
# devcrew dừng bản chạy thử bằng cách dừng tiến trình này.
#
# Biến môi trường:
#   PREVIEW_PORT        cổng web (bắt buộc, devcrew truyền vào)
#   CREW_PREVIEW_BENCH  thư mục bench preview (mặc định: $HOME/frappe/preview-bench)
#   CREW_PREVIEW_SITE   site của bản chạy thử (mặc định: crew-preview.localhost)
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_bench.sh"

: "${PREVIEW_PORT:?Thiếu PREVIEW_PORT}"
BENCH_DIR="${CREW_PREVIEW_BENCH:-$HOME/frappe/preview-bench}"
SITE="${CREW_PREVIEW_SITE:-crew-preview.localhost}"
require_bench "$BENCH_DIR"

# Bench preview chỉ phục vụ một bản chạy thử tại một thời điểm (devcrew: max_active = 1).
exec 9>"$BENCH_DIR/.crew-preview.lock"
flock -w 600 9 || { echo "Bench preview đang bận" >&2; exit 4; }

echo "==> Build giao diện Vue"
frontend_build

echo "==> Chép mã app vào bench preview"
ensure_redis "$BENCH_DIR"
sync_app "$BENCH_DIR"
ensure_assets_link "$BENCH_DIR"
cd "$BENCH_DIR"

echo "==> Migrate site $SITE"
bench --site "$SITE" migrate --skip-search-index
compile_translations_if_any "$BENCH_DIR"
build_assets_if_any "$BENCH_DIR"
bench --site "$SITE" clear-cache

echo "==> Chạy web tại cổng $PREVIEW_PORT"
# Khóa flock (fd 9) được giữ cho đến khi web server dừng.
exec bench --site "$SITE" serve --port "$PREVIEW_PORT" --noreload --nothreading
