# CMS Architecture Notes

## Recommended Stack

- Laravel 12 or current stable Laravel release
- MySQL 8+
- React or Vue frontend through Vite
- Admin panel: Filament is a strong Laravel-native choice for fast CMS delivery
- Auth: Laravel Breeze/Jetstream for admin authentication, Sanctum for API access when needed

## Content Model

Pages should not be hardcoded once the backend is added. Store page records with ordered content blocks:

- Hero block
- Rich text block
- Service grid block
- Portfolio grid block
- CTA block
- SEO metadata block

Each block stores a typed JSON payload so editors can modify content while developers keep frontend rendering controlled.

## API Shape

Suggested public endpoints:

- `GET /api/pages/{slug}`
- `GET /api/portfolio`
- `GET /api/portfolio/{slug}`
- `GET /api/careers`
- `POST /api/contact`

Suggested admin routes should stay behind authenticated web middleware and authorization policies.

## Performance

- Cache published page payloads
- Use eager loading for content blocks and media
- Add image conversion and responsive sizes
- Use route caching, config caching, queue workers, and CDN-backed public assets in production

## SEO

- Generate sitemap from published pages, portfolio items, and career posts
- Validate canonical URLs
- Add JSON-LD per template
- Add redirect management before launch
- Track form submissions and CTA clicks with analytics events
