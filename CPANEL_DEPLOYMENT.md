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

The domain document root should point to:

```text
/home/YOUR_CPANEL_USER/REPO_FOLDER/public
```

If cPanel forces the repository itself to be the domain folder, move or point
the domain to the `public/` folder. Do not serve the repository root directly.

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

## First Run

Run from cPanel Terminal inside the repository root:

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --seed --force
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan optimize
chmod -R 775 storage bootstrap/cache public/uploads
```

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
