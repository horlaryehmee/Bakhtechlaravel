#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_ROOT="${APP_ROOT:-$SCRIPT_ROOT}"
GIT_ROOT="${GIT_ROOT:-}"
DEPLOY_REF="${DEPLOY_REF:-HEAD}"
REPAIR=false
FULL=false
QUICK=false

for argument in "$@"; do
  case "$argument" in
    --repair) REPAIR=true ;;
    --full) FULL=true ;;
    --quick) QUICK=true ;;
    --ref=*) DEPLOY_REF="${argument#--ref=}" ;;
    *)
      echo "Unknown argument: $argument" >&2
      exit 2
      ;;
  esac
done

cd "$APP_ROOT"

if [ -z "$GIT_ROOT" ]; then
  if [ -s "$APP_ROOT/storage/app/deployment-git-root" ]; then
    GIT_ROOT="$(<"$APP_ROOT/storage/app/deployment-git-root")"
  elif [ -d "$APP_ROOT/.git" ]; then
    GIT_ROOT="$APP_ROOT"
  else
    echo "Deployment integrity failed: the trusted Git checkout is not configured." >&2
    exit 1
  fi
fi

if [ ! -d "$GIT_ROOT/.git" ]; then
  echo "Deployment integrity failed: trusted Git checkout not found: $GIT_ROOT" >&2
  exit 1
fi

if [ "${INTEGRITY_SKIP_LOCK:-0}" != "1" ] && command -v flock >/dev/null 2>&1; then
  mkdir -p "$APP_ROOT/storage/framework"
  exec 8>"$APP_ROOT/storage/framework/deployment.lock"
  if ! flock -n 8; then
    echo "Integrity check skipped: a deployment is in progress."
    exit 0
  fi
fi

git -C "$GIT_ROOT" cat-file -e "${DEPLOY_REF}^{commit}"

corrupt_count=0
repaired_count=0

is_safe_source_path() {
  local path="$1"

  case "$path" in
    app/*.php|app/*/*.php|app/*/*/*.php|app/*/*/*/*.php|app/*/*/*/*/*.php|\
    bootstrap/*.php|bootstrap/*/*.php|\
    config/*.php|config/*/*.php|\
    database/*.php|database/*/*.php|database/*/*/*.php|\
    routes/*.php|artisan|composer.json|composer.lock|public/index.php)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

repair_file_atomically() {
  local path="$1"
  local directory
  local temporary

  directory="$(dirname "$path")"
  mkdir -p "$directory"
  temporary="$(mktemp "${directory}/.deploy-repair.XXXXXX")"

  if ! git -C "$GIT_ROOT" show "${DEPLOY_REF}:${path}" > "$temporary"; then
    rm -f "$temporary"
    return 1
  fi

  chmod 0644 "$temporary"
  mv -f "$temporary" "$path"
}

while IFS= read -r path; do
  [ -n "$path" ] || continue
  is_safe_source_path "$path" || continue

  expected_hash="$(git -C "$GIT_ROOT" rev-parse "${DEPLOY_REF}:${path}")"
  actual_hash=""

  if [ -f "$path" ]; then
    actual_hash="$(git hash-object "$path")"
  fi

  needs_repair=false
  if [ ! -s "$path" ]; then
    needs_repair=true
  elif [ "$FULL" = true ] && [ "$actual_hash" != "$expected_hash" ]; then
    needs_repair=true
  fi

  if [ "$needs_repair" = true ]; then
    corrupt_count=$((corrupt_count + 1))
    echo "Source integrity failure: $path" >&2

    if [ "$REPAIR" = true ]; then
      repair_file_atomically "$path"

      if [ "$(git hash-object "$path")" != "$expected_hash" ]; then
        echo "Atomic repair failed: $path" >&2
        exit 1
      fi

      repaired_count=$((repaired_count + 1))
      echo "Repaired atomically from ${DEPLOY_REF}: $path"
    fi
  fi
done < <(git -C "$GIT_ROOT" ls-tree -r --name-only "$DEPLOY_REF" -- app bootstrap config database routes artisan composer.json composer.lock public/index.php)

if [ "$corrupt_count" -gt 0 ] && [ "$REPAIR" = false ]; then
  echo "Deployment integrity failed: ${corrupt_count} corrupt or missing source file(s)." >&2
  exit 1
fi

if [ "$QUICK" = false ]; then
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    php -l "$path" >/dev/null
  done < <(find app bootstrap config database routes -type f -name '*.php' -print)

  php -r "require 'vendor/autoload.php'; exit(class_exists('App\\Http\\Controllers\\Api\\HealthController') && class_exists('App\\Http\\Controllers\\Api\\BakhtechApiController') ? 0 : 1);"
fi

echo "Deployment integrity OK. Repaired: ${repaired_count}."
