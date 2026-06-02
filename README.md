# Bakhtech Solutions Website

Laravel backend/API with a React + TypeScript frontend for the Bakhtech
Solutions website and admin dashboard.

The Laravel application lives at the repository root for cPanel compatibility.
The React source lives in `frontend/`. The compiled frontend is committed into
Laravel's `public/` folder so cPanel can serve the site without Node.

## Local Laravel

From the repository root:

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Reset local data:

```bash
php artisan migrate:fresh --seed
```

Default local admin login:

- Email: `admin@bakhtech.com.ng`
- Password: `ChangeMe123!`

## Local Frontend

From `frontend/`:

```bash
npm install
npm run dev
```

PowerShell may block `npm.ps1` on this computer. Use `npm.cmd` if needed:

```bash
npm.cmd run dev
```

The local frontend uses `frontend/.env.development` and calls the Laravel API at
`http://127.0.0.1:8000`.

## Build Frontend For cPanel

From `frontend/`:

```bash
npm run build
```

The build writes into root `public/` while preserving Laravel's `public/index.php`
and `public/.htaccess`.

For same-domain cPanel hosting, keep:

```text
VITE_API_BASE_URL=
```

## cPanel

See `CPANEL_DEPLOYMENT.md`.

The domain document root should point to:

```text
public/
```

Health check:

```text
/api/health
```
