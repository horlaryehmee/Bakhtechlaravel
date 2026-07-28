# cPanel Deployment

This repository is now a root Laravel application. The React frontend source is
in `frontend/`, and the compiled frontend is committed into Laravel's `public/`
folder for cPanel.

## Required cPanel Layout

Do not use `public_html` as the cPanel Git repository path. cPanel updates a
repository worktree before deployment tasks run, so an interrupted checkout can
replace a live PHP file with an empty or partial file before Laravel can enter
maintenance mode.

```text
/home/bakhtech/
|-- repositories/
|   `-- Bakhtechlaravel/  # cPanel Git checkout; never served by the domain
`-- public_html/          # deployed application and persistent runtime data
```

Create the cPanel Git repository at:

```text
/home/bakhtech/repositories/Bakhtechlaravel
```

For the one-time migration from the old layout:

1. In **Git Version Control**, remove cPanel management for the repository whose
   path is `/home/bakhtech/public_html`. cPanel leaves the directory and website
   files in place.
2. Clone `https://github.com/horlaryehmee/Bakhtechlaravel.git` as a new
   cPanel-managed repository at
   `/home/bakhtech/repositories/Bakhtechlaravel`.
3. Open the new repository's **Pull or Deploy** screen, click **Update from
   Remote**, then click **Deploy HEAD Commit**.
4. Do not reconnect `/home/bakhtech/public_html` as a Git repository.

The committed `.cpanel.yml` publishes a fully staged and verified release from
that checkout to `/home/bakhtech/public_html`. It preserves `.env`, `storage/`,
`public/uploads/`, and installed dependencies. It also keeps three source
backups in `/home/bakhtech/.bakhtech-deploy-backups` and restores the previous
release automatically if a local validation step fails.

If the domain document root can be changed, `/home/bakhtech/public_html/public`
is preferred. Otherwise the root `.htaccess` safely forwards requests to the
Laravel public directory.

## Configure Backend

1. In cPanel, create a MySQL database and database user.
2. Give the user all privileges on that database.
3. Copy `.env.live.example` to `/home/bakhtech/public_html/.env`.
4. Fill these values:
   - `APP_URL`
   - `DB_HOST` (`localhost` on most cPanel hosts; use `127.0.0.1` only if your host confirms TCP MySQL is enabled)
   - `DB_DATABASE`
   - `DB_USERNAME`
   - `DB_PASSWORD`
   - `SESSION_DOMAIN`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `API_TOKEN_SECRET`
   - `FRONTEND_ORIGINS`
   - SMTP values (`MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`)
   - `FLUTTERWAVE_WEBHOOK_SECRET` when Flutterwave invoice payments are enabled

## Redis Cache on cPanel

The app reads Redis from `.env`, so do not commit the Redis password. For the
cPanel Redis service, set these live `.env` values:

```text
CACHE_STORE=redis
SESSION_DRIVER=redis
SESSION_CONNECTION=default
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PORT=39445
REDIS_PASSWORD=YOUR_CPANEL_REDIS_PASSWORD
REDIS_DB=0
REDIS_CACHE_DB=1
REDIS_CACHE_CONNECTION=cache
REDIS_CACHE_LOCK_CONNECTION=default
```

After changing Redis values on cPanel, run:

```bash
php artisan optimize:clear
php artisan optimize
```

The homepage public API responses are cached for faster repeat loads and are
cleared automatically when admin settings, projects, reviews, or pricing are
updated.

## First Run

For an existing site, keep the current `/home/bakhtech/public_html/.env`. For a
new site, create that file first, then run:

```bash
cd /home/bakhtech/repositories/Bakhtechlaravel
APP_ROOT=/home/bakhtech/public_html bash scripts/cpanel-deploy.sh
cd /home/bakhtech/public_html
php artisan key:generate
php artisan migrate --seed --force
chmod -R 775 storage bootstrap/cache public/uploads
```

Never run `php artisan key:generate --force` on an existing site because it
invalidates encrypted sessions and application data.

For repeat deployments, use cPanel's **Deploy HEAD Commit** action in the
repository at `/home/bakhtech/repositories/Bakhtechlaravel`. From a terminal,
the equivalent command is:

```bash
cd /home/bakhtech/repositories/Bakhtechlaravel
APP_ROOT=/home/bakhtech/public_html bash scripts/cpanel-deploy.sh
```

The script fetches `main` from
`https://github.com/horlaryehmee/Bakhtechlaravel.git`, validates every PHP file
in a temporary release, enters maintenance mode, publishes the verified source,
repairs any hash mismatch atomically from Git, installs production Composer
dependencies, runs migrations and database checks, rebuilds Laravel caches, and
checks the health, readiness, and admin routes.

Do not upload application PHP files with File Manager or FTP. User uploads
belong only in `public/uploads/`; application releases must go through Git
deployment.

Run those commands only after the updated `app/`, `routes/`, and `database/`
files have been deployed. If the frontend is deployed before the backend route
files, the admin may show an API route error or a method-not-supported error.

After deployment, verify the SMTP routes:

```bash
php artisan route:list --path=api/admin/mail
```

The output must include both `GET` and `POST` for
`api/admin/mail/settings`, plus the test and log routes.

## Admin Deployment Button

After this version has been deployed and Laravel caches have been cleared once,
full administrators can use:

```text
Admin > Settings > Advanced > Run deployment update
```

The button runs database and cache maintenance only:

```bash
php artisan migrate --force
php artisan optimize:clear
php artisan optimize
```

It does not fetch or publish application source and does not replace Git
deployment.

Add this cPanel cron entry. The scheduler sends booking reminders, monitors the
public readiness endpoint, and repairs missing, empty, truncated, or modified
tracked source files from the trusted repository every minute:

```cron
* * * * * cd /home/bakhtech/public_html && php artisan schedule:run >> /dev/null 2>&1
```

Configure payment provider webhooks:

```text
Paystack:     https://YOUR_DOMAIN_HERE/api/invoices/payments/paystack/webhook
Flutterwave: https://YOUR_DOMAIN_HERE/api/invoices/payments/flutterwave/webhook
```

Use the same Flutterwave webhook hash in the provider dashboard and
`FLUTTERWAVE_WEBHOOK_SECRET`.

## Frontend Builds

You do not need Node on cPanel for normal deployment because the current
compiled frontend is tracked in `public/`.

When the frontend changes locally:

```bash
cd frontend
npm install
npm run build
cd ..
git add frontend public
git commit -m "Build frontend"
git push
```

For same-domain cPanel hosting, keep `frontend/.env` production value as:

```text
VITE_API_BASE_URL=
```

That makes the browser call `/api/...` on the same domain.

## Test

Open:

```text
https://YOUR_DOMAIN_HERE/
https://YOUR_DOMAIN_HERE/api/health
https://YOUR_DOMAIN_HERE/admin/login
```

Expected API health:

```json
{"ok":true,"service":"bakhtech-api"}
```
