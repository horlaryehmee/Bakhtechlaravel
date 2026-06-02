# cPanel Deployment

This folder is the Laravel backend source. The React frontend source lives in
the repository root.

## Build Frontend

From the repository root:

```bash
npm install
npm run build
```

For same-domain cPanel hosting, keep `VITE_API_BASE_URL` empty for production
so browser requests use `/api/...` on the current domain.

Copy the contents of root `dist` into `backend-laravel-app/public`, preserving:

- `public/index.php`
- `public/.htaccess`

## Configure Backend

1. In cPanel, create a MySQL database and user.
2. Give the user all privileges on that database.
3. Copy `.env.live.example` to `.env`.
4. Fill:
   - `APP_URL`
   - `DB_DATABASE`
   - `DB_USERNAME`
   - `DB_PASSWORD`
   - `SESSION_DOMAIN`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `API_TOKEN_SECRET`
   - `FRONTEND_ORIGINS`

## Upload

Upload `backend-laravel-app` as the Laravel app root. The domain document root
must point to `backend-laravel-app/public`.

## First Run

Run from cPanel Terminal inside the Laravel app root:

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --seed --force
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan optimize
```

Make these folders writable if needed:

```bash
chmod -R 775 storage bootstrap/cache public/uploads
```

## Test

Open:

- `https://YOUR_DOMAIN_HERE/api/health`
- `https://YOUR_DOMAIN_HERE/admin/login`

Expected API health:

```json
{"ok":true,"service":"bakhtech-api"}
```

