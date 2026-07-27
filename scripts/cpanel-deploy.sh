#!/usr/bin/env bash
set -euo pipefail

REMOTE_URL="${REMOTE_URL:-https://github.com/horlaryehmee/Bakhtechlaravel.git}"
BRANCH="${BRANCH:-main}"

cd "$(dirname "$0")/.."

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REMOTE_URL"
fi

git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

composer install --no-dev --optimize-autoloader

if php -r "exit(class_exists('Redis') ? 0 : 1);"; then
  :
else
  echo "Warning: PHP Redis extension is not installed. Use CACHE_STORE=database and SESSION_DRIVER=database in .env." >&2
fi

php artisan migrate --force
php artisan optimize:clear
php artisan optimize

if [ ! -s app/Http/Controllers/Api/BakhtechApiController.php ]; then
  echo "Deployment failed: BakhtechApiController.php is missing or empty." >&2
  exit 1
fi

if [ ! -s public/bakhtech-logo-white.png ]; then
  echo "Deployment failed: white logo asset is missing or empty." >&2
  exit 1
fi

php artisan route:list --path=admin >/dev/null

echo "Deployment complete."
