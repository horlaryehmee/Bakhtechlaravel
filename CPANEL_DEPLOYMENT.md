# cPanel Deployment

This repository is now a root Laravel application. The React frontend source is
in `frontend/`, and the compiled frontend is committed into Laravel's `public/`
folder for cPanel.

## Required cPanel Layout

Your cPanel Git checkout should show Laravel files at the repository root:

```text
app/
bootstrap/
config/
database/
public/
routes/
storage/
artisan
composer.json
```

Best setup: the domain document root should point to:

```text
/home/YOUR_CPANEL_USER/REPO_FOLDER/public
```

If cPanel forces the repository itself to be the domain folder, the root
`.htaccess` forwards requests into `public/`. The `public/.htaccess` file must
remain Laravel's rewrite file so `/api/...` routes reach `public/index.php`.

## Configure Backend

1. In cPanel, create a MySQL database and database user.
2. Give the user all privileges on that database.
3. Copy `.env.live.example` to `.env`.
4. Fill these values:
   - `APP_URL`
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

Run from cPanel Terminal inside the repository root:

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --seed --force
php artisan optimize:clear
php artisan optimize
chmod -R 775 storage bootstrap/cache public/uploads
```

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

The button runs:

```bash
php artisan migrate --force
php artisan optimize:clear
php artisan optimize
```

The first deployment of the button still requires the terminal commands in
**First Run**, because an older cached route table cannot know about the new
maintenance endpoint. Future deployments can use the admin button.

Add this cPanel cron entry so booking reminders and future scheduled tasks run:

```cron
* * * * * cd /home/YOUR_CPANEL_USER/REPO_FOLDER && php artisan schedule:run >> /dev/null 2>&1
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
