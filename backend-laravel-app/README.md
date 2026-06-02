# Bakhtech Laravel API

This is the Laravel backend for Bakhtech. The React frontend source lives in the
repository root, and this backend exposes the `/api/...` routes used by that
frontend.

## Run Locally

From the project root:

```bash
npm run backend
npm run dev
```

Or from this folder:

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Reset local data:

```bash
php artisan migrate:fresh --seed
```

Default admin login:

- Email: `admin@bakhtech.com.ng`
- Password: `ChangeMe123!`

## cPanel

Use MySQL or MariaDB on cPanel. See `CPANEL_DEPLOYMENT.md`.
