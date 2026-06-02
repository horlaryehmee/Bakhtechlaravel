# Bakhtech Solutions Website

React + TypeScript frontend with a Laravel/MySQL admin/API backend for the Bakhtech Solutions agency website. The backend stores CMS, portfolio, media, bookings, visits, and admin data in SQL tables for cPanel hosting.

Developed by Bakare Olayemi, Bakhtech Solutions.

## Current Status

- Frontend: React, TypeScript, Vite, Tailwind CSS v4
- Routing: Home, About, Portfolio, Career, Contact
- Motion: GSAP cinematic homepage hero
- UI structure: `src/components/ui` for shadcn-style reusable components
- Assets: remote Unsplash image URLs in `src/data/site.ts`
- Backend: Laravel API in `backend-laravel-app`

## Local Commands

```bash
npm install
npm run backend
npm run dev
npm run build
```

PowerShell may block `npm.ps1` on this computer. Use `npm.cmd` if needed:

```bash
npm.cmd run dev
```

The local frontend is configured by `.env.development` to call the Laravel API at
`http://127.0.0.1:8000`.

## Laravel Backend / cPanel Deployment

The Laravel app is in `backend-laravel-app`. See
`backend-laravel-app/CPANEL_DEPLOYMENT.md` for the full cPanel setup.

Build the React frontend separately:

```bash
npm install
npm run build
```

If the frontend is hosted separately from Laravel, build the frontend with:

```bash
VITE_API_BASE_URL=https://your-api-domain.com npm run build
```

For same-domain cPanel hosting, leave `VITE_API_BASE_URL` empty before building
so browser requests use `/api/...` on the current domain.

## Key Files

- `src/components/ui/cinematic-landing-hero.tsx` - cinematic GSAP hero adapted for Bakhtech
- `src/components/ui` - default shadcn-compatible component path
- `src/components/layout/SiteLayout.tsx` - navigation and footer
- `src/pages` - starter website pages
- `src/lib/api.ts` - API client for admin and public data
- `backend-laravel-app` - full local Laravel app, configured for SQLite
- `backend-laravel-app/routes/api.php` - Laravel API routes
- `backend-laravel-app/app/Http/Controllers/Api/BakhtechApiController.php` - Laravel API implementation
- `backend-laravel-app/database/migrations` - MySQL/MariaDB schema

## Local Laravel Backend

The local Laravel app is already created in `backend-laravel-app`. It uses
SQLite locally. cPanel should use MySQL/MariaDB with the `.env` values shown in
`backend-laravel-app/.env.live.example`.

To reset local data:

```bash
cd backend-laravel-app
php artisan migrate:fresh --seed
```

Default local admin login:

- Email: `admin@bakhtech.com.ng`
- Password: `ChangeMe123!`
