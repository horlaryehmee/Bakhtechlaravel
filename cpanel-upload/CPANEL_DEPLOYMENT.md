# cPanel Deployment

Use this `cpanel-upload` folder for the live Laravel app.

## Before Upload

1. In cPanel, create a MySQL database and user.
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

`APP_KEY` can be generated after upload with `php artisan key:generate --force`.
If you cannot run terminal commands on cPanel, generate the key locally and paste
it into `.env`.

## Upload

Upload the contents of this folder to the Laravel app root on cPanel.
The domain document root must point to this app's `public` folder.

Keep these files in `public`:

- `index.php`
- `.htaccess`
- `index.html`
- `assets/`
- existing image/icon folders

## First Run

Run these from cPanel Terminal inside the app root:

```bash
php artisan key:generate --force
php artisan migrate --seed --force
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan optimize
```

The `vendor` folder is already included in this upload package. If you prefer to
install dependencies on cPanel instead, run:

```bash
composer install --no-dev --optimize-autoloader
```

Make these folders writable if cPanel does not do it automatically:

```bash
chmod -R 775 storage bootstrap/cache public/uploads
```

## Test

Open:

- `https://YOUR_DOMAIN_HERE/api/health`
- `https://YOUR_DOMAIN_HERE/admin/login`
- `https://YOUR_DOMAIN_HERE/live-check.php`

The API health response should contain:

```json
{"ok":true,"service":"bakhtech-api"}
```

Delete `public/live-check.php` after the site is confirmed working.

## Notes

The backend does not need Node on cPanel. Node is only used on your computer to
build the React frontend. The built frontend files are already in `public`.

Some PHP dependency packages inside `vendor` may contain documentation or browser
debug assets with `.js` filenames. They are not a Node backend and do not require
Node to run.
