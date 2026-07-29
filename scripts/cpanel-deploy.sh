#!/usr/bin/env bash
set -Eeuo pipefail

REMOTE_URL="${REMOTE_URL:-https://github.com/horlaryehmee/Bakhtechlaravel.git}"
BRANCH="${BRANCH:-main}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-bakhtech_deploy_source}"
SOURCE_ROOT="${SOURCE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
APP_ROOT="${APP_ROOT:-$SOURCE_ROOT}"
BACKUP_ROOT="${BACKUP_ROOT:-$(dirname "$APP_ROOT")/.bakhtech-deploy-backups}"
KEEP_BACKUPS="${KEEP_BACKUPS:-3}"

for command in git tar rsync php composer flock; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Deployment failed: required command is unavailable: $command" >&2
    exit 1
  fi
done

if [ ! -d "$SOURCE_ROOT/.git" ]; then
  echo "Deployment failed: the deployment source is not a Git checkout: $SOURCE_ROOT" >&2
  exit 1
fi

mkdir -p "$APP_ROOT/storage/app" "$APP_ROOT/storage/framework" "$BACKUP_ROOT"
exec 9>"$APP_ROOT/storage/framework/deployment.lock"
if ! flock -n 9; then
  echo "Deployment failed: another deployment or integrity repair is running." >&2
  exit 1
fi

cd "$SOURCE_ROOT"

if git remote get-url "$DEPLOY_REMOTE" >/dev/null 2>&1; then
  git remote set-url "$DEPLOY_REMOTE" "$REMOTE_URL"
else
  git remote add "$DEPLOY_REMOTE" "$REMOTE_URL"
fi

git fetch --no-tags "$DEPLOY_REMOTE" "$BRANCH"
git fsck --connectivity-only --no-dangling
RELEASE_REF="$(git rev-parse 'FETCH_HEAD^{commit}')"

if [ -s "$APP_ROOT/storage/app/deployment-ref" ]; then
  PREVIOUS_REF="$(<"$APP_ROOT/storage/app/deployment-ref")"
elif [ "$APP_ROOT" != "$SOURCE_ROOT" ] && [ -d "$APP_ROOT/.git" ]; then
  PREVIOUS_REF="$(git -C "$APP_ROOT" rev-parse HEAD)"
else
  PREVIOUS_REF="$(git rev-parse HEAD)"
fi

if ! git cat-file -e "${PREVIOUS_REF}^{commit}" 2>/dev/null; then
  echo "Previous deployment ref is unavailable; using the current source ref for rollback." >&2
  PREVIOUS_REF="$(git rev-parse HEAD)"
fi

RELEASE_ID="$(date -u +%Y%m%d%H%M%S)-${RELEASE_REF:0:12}"
STAGE_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/bakhtech-release.XXXXXX")"
BACKUP_FILE="$BACKUP_ROOT/${RELEASE_ID}-before.tar.gz"
ROLLBACK_REQUIRED=false
MAINTENANCE_ENABLED=false

remove_paths_added_by_release() {
  local path

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    case "$path" in
      /*|../*|*/../*) continue ;;
    esac
    rm -f "$APP_ROOT/$path"
  done < <(git diff --diff-filter=A --name-only "$PREVIOUS_REF" "$RELEASE_REF")
}

remove_paths_deleted_by_release() {
  local path

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    case "$path" in
      /*|../*|*/../*) continue ;;
    esac
    rm -f "$APP_ROOT/$path"
  done < <(git diff --diff-filter=D --name-only "$PREVIOUS_REF" "$RELEASE_REF")
}

restore_previous_release() {
  echo "Deployment failed. Restoring source from ${PREVIOUS_REF}." >&2
  remove_paths_added_by_release
  git archive "$PREVIOUS_REF" | tar -x -C "$APP_ROOT"

  APP_ROOT="$APP_ROOT" GIT_ROOT="$SOURCE_ROOT" DEPLOY_REF="$PREVIOUS_REF" INTEGRITY_SKIP_LOCK=1 \
    bash "$APP_ROOT/scripts/deployment-integrity.sh" --repair --full --quick

  composer install --working-dir="$APP_ROOT" --no-dev --no-interaction --prefer-dist --optimize-autoloader
  php "$APP_ROOT/artisan" optimize:clear
  php "$APP_ROOT/artisan" optimize
}

finish() {
  local status=$?
  set +e

  if [ "$status" -ne 0 ] && [ "$ROLLBACK_REQUIRED" = true ]; then
    restore_previous_release
    rollback_status=$?
    if [ "$rollback_status" -ne 0 ]; then
      echo "Automatic rollback also failed. Restore this backup manually: $BACKUP_FILE" >&2
    fi
  fi

  if [ "$MAINTENANCE_ENABLED" = true ]; then
    php "$APP_ROOT/artisan" up >/dev/null 2>&1
  fi

  rm -rf "$STAGE_ROOT"
  exit "$status"
}
trap finish EXIT

echo "Staging release ${RELEASE_REF}."
git archive "$RELEASE_REF" | tar -x -C "$STAGE_ROOT"

if find "$STAGE_ROOT/app" "$STAGE_ROOT/bootstrap" "$STAGE_ROOT/config" "$STAGE_ROOT/database" "$STAGE_ROOT/routes" \
  -type f -name '*.php' -size 0 -print -quit | grep -q .; then
  echo "Deployment failed: the staged release contains an empty PHP file." >&2
  exit 1
fi

while IFS= read -r php_file; do
  php -l "$php_file" >/dev/null
done < <(find "$STAGE_ROOT/app" "$STAGE_ROOT/bootstrap" "$STAGE_ROOT/config" "$STAGE_ROOT/database" "$STAGE_ROOT/routes" \
  -type f -name '*.php' -print)

if [ ! -s "$STAGE_ROOT/app/Http/Controllers/Api/BakhtechApiController.php" ] ||
  [ ! -s "$STAGE_ROOT/app/Http/Controllers/Api/HealthController.php" ]; then
  echo "Deployment failed: a required API controller is missing from the staged release." >&2
  exit 1
fi

composer validate --working-dir="$STAGE_ROOT" --no-check-publish --no-interaction

# Record the trusted checkout outside the web root for the scheduled integrity repair.
printf '%s\n' "$SOURCE_ROOT" > "$APP_ROOT/storage/app/deployment-git-root"

# Repair the active release first so Laravel can enter maintenance mode.
APP_ROOT="$APP_ROOT" GIT_ROOT="$SOURCE_ROOT" DEPLOY_REF="$PREVIOUS_REF" INTEGRITY_SKIP_LOCK=1 \
  bash "$SOURCE_ROOT/scripts/deployment-integrity.sh" --repair --quick

php "$APP_ROOT/artisan" down --retry=60
MAINTENANCE_ENABLED=true

tar \
  -C "$APP_ROOT" \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='storage' \
  --exclude='public/uploads' \
  --exclude='vendor' \
  -czf "$BACKUP_FILE" .

ROLLBACK_REQUIRED=true
remove_paths_deleted_by_release

rsync -a \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='storage/' \
  --exclude='public/uploads/' \
  --exclude='vendor/' \
  --exclude='node_modules/' \
  --exclude='frontend/node_modules/' \
  "$STAGE_ROOT/" "$APP_ROOT/"

APP_ROOT="$APP_ROOT" GIT_ROOT="$SOURCE_ROOT" DEPLOY_REF="$RELEASE_REF" INTEGRITY_SKIP_LOCK=1 \
  bash "$APP_ROOT/scripts/deployment-integrity.sh" --repair --full --quick

composer install --working-dir="$APP_ROOT" --no-dev --no-interaction --prefer-dist --optimize-autoloader

php "$APP_ROOT/artisan" migrate --force
php "$APP_ROOT/artisan" database:check --repair
php "$APP_ROOT/artisan" optimize:clear
php "$APP_ROOT/artisan" optimize
php "$APP_ROOT/artisan" site:verify-admin-runtime

APP_ROOT="$APP_ROOT" GIT_ROOT="$SOURCE_ROOT" DEPLOY_REF="$RELEASE_REF" INTEGRITY_SKIP_LOCK=1 \
  bash "$APP_ROOT/scripts/deployment-integrity.sh" --repair --full

php "$APP_ROOT/artisan" route:list --path=api/health >/dev/null
php "$APP_ROOT/artisan" route:list --path=api/ready >/dev/null
php "$APP_ROOT/artisan" route:list --path=api/reviews >/dev/null
php "$APP_ROOT/artisan" route:list --path=api/projects >/dev/null
php "$APP_ROOT/artisan" route:list --path=api/settings >/dev/null
php "$APP_ROOT/artisan" route:list --path=api/visits >/dev/null
php "$APP_ROOT/artisan" route:list --path=admin >/dev/null

php "$APP_ROOT/artisan" up
MAINTENANCE_ENABLED=false

if command -v curl >/dev/null 2>&1; then
  HEALTHCHECK_URL="${HEALTHCHECK_URL:-$(php -r "require '$APP_ROOT/vendor/autoload.php'; \$app = require '$APP_ROOT/bootstrap/app.php'; echo rtrim((string) \$app->make('config')->get('app.url'), '/').'/api/ready';")}"
  if ! curl --fail --silent --show-error --retry 2 --retry-delay 2 --max-time 20 "$HEALTHCHECK_URL" | grep -q '"ok"[[:space:]]*:[[:space:]]*true'; then
    echo "Warning: external readiness check failed after local validation: $HEALTHCHECK_URL" >&2
  fi
fi

ROLLBACK_REQUIRED=false
printf '%s\n' "$RELEASE_REF" > "$APP_ROOT/storage/app/deployment-ref"

if [ "$APP_ROOT" = "$SOURCE_ROOT" ]; then
  CURRENT_BRANCH="$(git -C "$SOURCE_ROOT" symbolic-ref --quiet --short HEAD || true)"
  if [ "$CURRENT_BRANCH" = "$BRANCH" ]; then
    git -C "$SOURCE_ROOT" update-ref "refs/heads/$BRANCH" "$RELEASE_REF"
    git -C "$SOURCE_ROOT" read-tree "$RELEASE_REF"
    echo "Synchronized the cPanel checkout to ${RELEASE_REF}."
  fi
fi

find "$BACKUP_ROOT" -maxdepth 1 -type f -name '*-before.tar.gz' -printf '%T@ %p\n' \
  | sort -nr \
  | tail -n "+$((KEEP_BACKUPS + 1))" \
  | cut -d' ' -f2- \
  | while IFS= read -r old_backup; do
      [ -n "$old_backup" ] && rm -f "$old_backup"
    done

echo "Deployment complete: ${RELEASE_REF}. Backup: ${BACKUP_FILE}"
