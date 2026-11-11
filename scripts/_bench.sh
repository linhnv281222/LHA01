# Hàm dùng chung cho verify.sh và preview.sh. Không chạy trực tiếp file này.
#
# Mô hình: trên máy có hai bench Frappe dựng sẵn (xem hướng dẫn cài đặt của devcrew):
#   - bench test   : verify và Dev dùng để migrate + chạy test
#   - bench preview: chạy bản chạy thử cho người xem
# Mỗi lần chạy, mã của app trong repo hiện tại được chép (rsync) vào apps/<app> của bench,
# rồi migrate site. Khóa flock bảo đảm hai lệnh không đụng cùng một bench một lúc.

APP_NAME="contract_tracker"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_bench() {
  local bench_dir="$1"
  if [ ! -f "$bench_dir/sites/common_site_config.json" ]; then
    echo "Không thấy bench Frappe ở $bench_dir. Chạy script cài bench của devcrew trước." >&2
    exit 3
  fi
  if ! command -v bench >/dev/null 2>&1; then
    echo "Không thấy lệnh bench trong PATH." >&2
    exit 3
  fi
}

ensure_redis() {
  # Bench cần redis cache và redis queue; khởi động nếu chưa chạy.
  local bench_dir="$1" conf port
  for conf in redis_cache redis_queue; do
    port="$(grep -E '^port ' "$bench_dir/config/$conf.conf" | awk '{print $2}')"
    if ! redis-cli -p "$port" ping >/dev/null 2>&1; then
      # 9>&- : không để redis (chạy nền lâu dài) giữ khóa flock của verify/preview.
      (cd "$bench_dir" && redis-server "config/$conf.conf" --daemonize yes >/dev/null 9>&-)
    fi
  done
}

sync_app() {
  # Chép mã app vào bench. Không chép .git và các thư mục sinh ra khi build.
  local bench_dir="$1"
  rsync -a --delete \
    --exclude '.git' --exclude '__pycache__' --exclude 'node_modules' --exclude '*.pyc' \
    "$REPO_ROOT/" "$bench_dir/apps/$APP_NAME/"
}

ensure_assets_link() {
  # /assets/<app>/... được phục vụ qua symlink sites/assets/<app> -> apps/<app>/<app>/public.
  # bench build tạo link này, nhưng ta không chạy bench build cho frontend Vue nên tự tạo.
  local bench_dir="$1"
  local target="$bench_dir/apps/$APP_NAME/$APP_NAME/public"
  [ -d "$target" ] || return 0
  if [ "$(readlink "$bench_dir/sites/assets/$APP_NAME" 2>/dev/null)" != "$target" ]; then
    ln -sfn "$target" "$bench_dir/sites/assets/$APP_NAME"
  fi
}

compile_translations_if_any() {
  local bench_dir="$1"
  if ls "$REPO_ROOT/$APP_NAME/locale/"*.po >/dev/null 2>&1; then
    (cd "$bench_dir" && bench compile-po-to-mo --app "$APP_NAME" >/dev/null)
  fi
}

build_assets_if_any() {
  local bench_dir="$1"
  # Chỉ chạy bench build khi app có asset cho Desk (public/js, public/css...). Bản build của
  # frontend Vue (public/frontend) đã có sẵn từ frontend_build, không cần bench build.
  if find "$REPO_ROOT/$APP_NAME/public" -path "$REPO_ROOT/$APP_NAME/public/frontend" -prune -o -type f \
      \( -name '*.js' -o -name '*.css' -o -name '*.bundle.*' \) -print 2>/dev/null | grep -q .; then
    (cd "$bench_dir" && bench build --app "$APP_NAME")
  fi
}

# ---------------------------------------------------------------------------
# Frontend Vue (Frappe UI) trong thư mục frontend/
# ---------------------------------------------------------------------------
FRONTEND_DIR="$REPO_ROOT/frontend"

frontend_deps() {
  # node_modules dùng chung theo mã băm của package-lock.json: chỉ tải một lần cho mỗi bộ thư viện.
  # Cài với --ignore-scripts: không chạy script cài đặt của thư viện bên thứ ba.
  [ -f "$FRONTEND_DIR/package-lock.json" ] || return 0
  local hash cache
  hash="$(sha256sum "$FRONTEND_DIR/package-lock.json" | cut -c1-16)"
  cache="${CREW_FE_CACHE:-$HOME/.cache/crew-frontend}/$hash"
  mkdir -p "$cache"
  (
    flock -w 900 8 || { echo "Chờ cài thư viện frontend quá lâu" >&2; exit 4; }
    if [ ! -f "$cache/.ok" ]; then
      echo "    Cài thư viện frontend lần đầu cho bộ $hash"
      cp "$FRONTEND_DIR/package.json" "$FRONTEND_DIR/package-lock.json" "$cache/"
      (cd "$cache" && npm ci --ignore-scripts --no-audit --no-fund --loglevel=error)
      touch "$cache/.ok"
    fi
  ) 8>"$cache.lock"
  if [ "$(readlink "$FRONTEND_DIR/node_modules" 2>/dev/null)" != "$cache/node_modules" ]; then
    rm -rf "$FRONTEND_DIR/node_modules"
    ln -s "$cache/node_modules" "$FRONTEND_DIR/node_modules"
  fi
}

frontend_build() {
  [ -f "$FRONTEND_DIR/package.json" ] || return 0
  frontend_deps
  python3 "$REPO_ROOT/scripts/gen_doctype_types.py" >/dev/null
  (cd "$FRONTEND_DIR" && npm run -s build -- --logLevel warn)
}

frontend_check() {
  # Sinh kiểu từ DocType, kiểm tra chuẩn UI/UX, kiểm tra kiểu TypeScript, chạy test, build.
  [ -f "$FRONTEND_DIR/package.json" ] || return 0
  frontend_deps
  python3 "$REPO_ROOT/scripts/gen_doctype_types.py"
  python3 "$REPO_ROOT/scripts/check_ui.py"
  (cd "$FRONTEND_DIR" && npm run -s typecheck)
  (cd "$FRONTEND_DIR" && npm run -s test -- --reporter=dot)
  (cd "$FRONTEND_DIR" && npm run -s build -- --logLevel warn)
}
