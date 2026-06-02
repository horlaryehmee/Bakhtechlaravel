# Bakhtech Laravel Backend

This folder contains the Laravel backend replacement for the previous JavaScript API.
It keeps the same `/api/...` contract used by the React frontend, but stores data in
SQL tables through Laravel's database layer. Use MySQL or MariaDB on cPanel.

## Install on cPanel

1. Create a Laravel app in cPanel or by SSH:

```bash
composer create-project laravel/laravel bakhtech-api
```

2. Copy the contents of this `backend-laravel` folder into the Laravel app root,
overwriting matching files.

3. Create a MySQL database and user in cPanel, then set `.env`:

```bash
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_cpanel_database
DB_USERNAME=your_cpanel_user
DB_PASSWORD=your_database_password

ADMIN_EMAIL=admin@bakhtech.com.ng
ADMIN_PASSWORD=ChangeMe123!
ADMIN_NAME="Bakhtech Admin"
API_TOKEN_SECRET=change-this-long-random-secret
```

4. Run:

```bash
php artisan migrate --seed
php artisan storage:link
```

5. Point the domain document root to the Laravel `public` directory.

6. Build the React frontend on your local machine and upload the `dist` contents
   into Laravel's `public` folder if you want Laravel to serve both frontend
   and API from one cPanel app. Preserve Laravel's existing `public/index.php`
   and `.htaccess` files.

If the React frontend is hosted separately, build it with:

```bash
VITE_API_BASE_URL=https://your-api-domain.com npm run build
```

If the React frontend is served from the same domain as Laravel, leave
`VITE_API_BASE_URL` empty.

The Laravel backend itself does not require Node on cPanel. Node is only needed
on your development machine to build the React frontend before upload.

## API Routes

- `POST /api/admin/login`
- `GET /api/admin/me`
- `GET /api/admin/dashboard`
- `GET /api/admin/projects`
- `GET /api/admin/cms`
- `PUT /api/admin/pages/{id}`
- `POST /api/admin/posts`
- `PUT /api/admin/posts/{id}`
- `DELETE /api/admin/posts/{id}`
- `POST /api/admin/bookings`
- `PUT /api/admin/bookings/{id}`
- `PUT /api/admin/settings`
- `GET /api/admin/media`
- `POST /api/admin/media`
- `DELETE /api/admin/media/{id}`
- `POST /api/admin/projects`
- `PUT /api/admin/projects/{id}`
- `DELETE /api/admin/projects/{id}`
- `GET /api/projects`
- `GET /api/settings`
- `POST /api/visits`
