#!/usr/bin/env bash
set -euo pipefail

REMOTE_URL="${REMOTE_URL:-https://github.com/horlaryehmee/Bakhtechlaravel.git}"
BRANCH="${BRANCH:-main}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-bakhtech_deploy_source}"

cd "$(dirname "$0")/.."

require_non_empty_file() {
  local path="$1"

  if [ ! -s "$path" ]; then
    echo "Deployment failed: $path is missing or empty." >&2
    exit 1
  fi
}

restore_required_file() {
  local path="$1"

  if [ -s "$path" ]; then
    return
  fi

  echo "Warning: $path is missing or empty after checkout. Restoring it from ${DEPLOY_REMOTE}/${BRANCH}." >&2
  git checkout "${DEPLOY_REMOTE}/${BRANCH}" -- "$path"
  require_non_empty_file "$path"
}

fail_on_empty_php_files() {
  local empty_files

  empty_files="$(find app bootstrap config database routes -type f -name '*.php' -size 0 -print)"
  if [ -n "$empty_files" ]; then
    echo "Deployment failed: these PHP files are empty:" >&2
    echo "$empty_files" >&2
    exit 1
  fi
}

repair_empty_tracked_php_files() {
  local empty_files
  local file

  empty_files="$(find app bootstrap config database routes -type f -name '*.php' -size 0 -print)"
  if [ -z "$empty_files" ]; then
    return
  fi

  echo "Warning: repairing empty tracked PHP files from ${DEPLOY_REMOTE}/${BRANCH}." >&2
  while IFS= read -r file; do
    if git cat-file -e "${DEPLOY_REMOTE}/${BRANCH}:${file}" 2>/dev/null; then
      git checkout "${DEPLOY_REMOTE}/${BRANCH}" -- "$file"
    fi
  done <<EOF
$empty_files
EOF
}

if git remote get-url "$DEPLOY_REMOTE" >/dev/null 2>&1; then
  git remote set-url "$DEPLOY_REMOTE" "$REMOTE_URL"
else
  git remote add "$DEPLOY_REMOTE" "$REMOTE_URL"
fi

git fetch --prune "$DEPLOY_REMOTE" "${BRANCH}:refs/remotes/${DEPLOY_REMOTE}/${BRANCH}"
git reset --hard "${DEPLOY_REMOTE}/${BRANCH}"

restore_required_file app/Http/Controllers/Api/BakhtechApiController.php
restore_required_file public/bakhtech-logo-white.png
repair_empty_tracked_php_files
fail_on_empty_php_files

composer install --no-dev --optimize-autoloader

if php -r "exit(class_exists('Redis') ? 0 : 1);"; then
  :
else
  echo "Warning: PHP Redis extension is not installed. Use CACHE_STORE=database and SESSION_DRIVER=database in .env." >&2
fi

php artisan migrate --force
php artisan optimize:clear
php artisan optimize

require_non_empty_file app/Http/Controllers/Api/BakhtechApiController.php
require_non_empty_file public/bakhtech-logo-white.png
repair_empty_tracked_php_files
fail_on_empty_php_files

php artisan route:list --path=admin >/dev/null

echo "Deployment complete."
