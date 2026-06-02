# Bakhtech Solutions Website

React + TypeScript frontend with an Express admin/API backend for the Bakhtech Solutions agency website. The backend stores CMS, portfolio, media, bookings, visits, and admin data in a SQLite file.

Developed by Bakare Olayemi, Bakhtech Solutions.

## Current Status

- Frontend: React, TypeScript, Vite, Tailwind CSS v4
- Routing: Home, About, Portfolio, Career, Contact
- Motion: GSAP cinematic homepage hero
- UI structure: `src/components/ui` for shadcn-style reusable components
- Assets: remote Unsplash image URLs in `src/data/site.ts`
- Backend: Express API with file-backed SQLite, JWT admin auth, media uploads, and production static serving

## Local Commands

```bash
npm install
npm run dev
npm run build
npm run dev:full
```

PowerShell may block `npm.ps1` on this computer. Use `npm.cmd` if needed:

```bash
npm.cmd run dev
```

## Production / Live Deployment

Build the frontend and run the Express server:

```bash
npm install
npm run build
npm run start
```

The Express server serves:

- `/` and all frontend pages from `dist`
- `/admin/login` and `/admin/dashboard`
- `/api/*` backend routes
- `/uploads/*` uploaded media files

For live use, set these environment variables:

```bash
API_PORT=4174
JWT_SECRET=use-a-long-random-secret
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=use-a-strong-password
DB_PATH=/persistent/data/bakhtech.sqlite
UPLOAD_DIR=/persistent/uploads
CLIENT_ORIGIN=https://your-domain.com
```

Important: `DB_PATH` and `UPLOAD_DIR` must point to persistent storage on the live server. If they point inside an ephemeral deployment folder, projects, settings, admin data, and uploaded media can be lost on redeploy.

If the frontend is hosted separately from the API, build the frontend with:

```bash
VITE_API_BASE_URL=https://your-api-domain.com npm run build
```

## Key Files

- `src/components/ui/cinematic-landing-hero.tsx` - cinematic GSAP hero adapted for Bakhtech
- `src/components/ui` - default shadcn-compatible component path
- `src/components/layout/SiteLayout.tsx` - navigation and footer
- `src/pages` - starter website pages
- `src/lib/api.ts` - API client for admin and public data
- `server/index.js` - Express API and production static server
- `server/db.js` - SQLite database setup, migrations, seed data, and CMS methods

## Laravel Setup When Composer Is Available

Install Composer, then create or move this frontend into a Laravel app:

```bash
composer create-project laravel/laravel bakhtech
cd bakhtech
php artisan install:api
npm install
npm install @vitejs/plugin-react react react-dom react-router-dom gsap lucide-react clsx tailwind-merge class-variance-authority
npm install -D typescript tailwindcss @tailwindcss/vite
```

Recommended Laravel frontend paths:

- React entry: `resources/js/main.tsx`
- React pages/components: `resources/js`
- Global CSS: `resources/css/app.css`
- Blade shell: `resources/views/app.blade.php`

If you keep shadcn defaults, create `resources/js/components/ui`. This matters because shadcn CLI and generated imports expect reusable UI primitives to live in `components/ui`, making future component installs predictable.

## CMS Plan

Use Laravel + MySQL with these core tables:

- `users`, `roles`, `permissions`
- `pages`: slug, title, status, template, SEO fields
- `content_blocks`: page_id, type, sort_order, JSON payload
- `media_assets`: path, alt_text, focal_point, metadata
- `portfolio_items`: title, slug, category, summary, body, image_id
- `career_posts`: title, slug, department, location, status, description
- `contact_submissions`: name, email, company, message, source
- `redirects`: from_path, to_path, status_code
- `activity_logs`: user_id, action, auditable type/id, metadata

Security baseline:

- Laravel Sanctum or session auth for admin
- CSRF protection, validation requests, rate limits, signed uploads
- Role-based authorization policies
- Secure headers, backups, audit logs, and spam controls

SEO baseline:

- Per-page title, description, canonical, robots, Open Graph, and JSON-LD schema
- Auto sitemap and robots.txt
- Redirect manager
- Image alt text and responsive image generation
- Analytics and conversion events
