# Bakhtech Local Laravel API

This is the runnable local Laravel backend for the React frontend in the parent
folder. It uses SQLite locally and exposes the same `/api/...` routes used by
the frontend.

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

Use MySQL or MariaDB on cPanel. The portable cPanel-oriented source and setup
notes are in `../backend-laravel`.

The backend does not require Node on cPanel. Build the React frontend from the
project root and upload the built `dist` files into Laravel's `public`
folder if you want one cPanel Laravel app to serve both frontend and API.
Preserve Laravel's existing `public/index.php` and `.htaccess` files.
