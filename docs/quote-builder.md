# Standalone quote builder

Public URL: `/quote-builder`
Admin URL: `/admin/quote-builder` (also linked in the dashboard)

This module uses only `qb_*` tables. Existing pricing controllers, tables,
checkout, and `/pricing` pages are independent.

## Deployment

Build the frontend with `npm run build` from `frontend/`. Deploy the resulting
`public/index.html` and assets with the PHP source, then run:

```sh
php artisan migrate --path=database/migrations/2026_09_26_000001_create_quote_builder_tables.php --force
php artisan migrate --path=database/migrations/2026_09_26_000002_add_quote_builder_catalogue.php --force
php artisan migrate --path=database/migrations/2026_09_26_000003_add_quote_builder_ordering.php --force
php artisan optimize:clear
```

The migration creates and seeds only the new estimator tables. It intentionally
does not run other pending migrations. Its rollback drops estimator requests,
so back up those tables before any rollback in production.

## Administration

Sign in with an existing administrator account. Configure project types,
starting minimum/maximum, questions and answer adjustments, features, and
complexity rules in the quote builder screen. Disable a feature or project type
to remove it from future estimates while retaining historical requests.

Each project type owns its questions and features through foreign keys. Answers
are predefined options; their labels, prices, and complexity scores are editable.
Optional discovery keys and customer-facing goal labels are editable for every
project type. Discovery recommendations follow those keys even when project
names or slugs change. Disabled types are excluded from discovery.

The One-page Product Catalogue starts at NGN 250,000 by default, with product
photos, descriptions, contact information and WhatsApp enquiries included.
Product management, categories and enquiry forms are optional additions. It
does not include a cart or checkout. Its starting price and range are editable,
just like every other project type; administrators can enter lower-budget offers.

The highest matching complexity threshold applies. Add the starting price and
answer/feature adjustments, apply the complexity uplift, then round up to
NGN 5,000. The upper estimate is the larger of the configured starting maximum
plus adjustments/uplift and the lower estimate plus range allowance. The lower
estimate uses the project's configured starting price (minimum input NGN 5,000).
Existing default prices remain unchanged. Custom flags or the discovery threshold
produce a custom quote with null amounts.

The server validates type-specific selections and calculates again when saving.
Lead information, answer rows, and feature rows are saved in one transaction.
Every request receives a UUID reference. Stored labels, individual prices, and
calculation inputs preserve the estimate as submitted even after admin edits.
Requests are visible in the administrator's Quote requests tab. This feature
does not send email notifications or generate payable invoices.

## Frontend ordering

Open Quote builder ? Frontend order. Choose project cards, questions, or features.
Drag rows or use the up/down buttons, then select Save frontend order. Questions
and features are ordered within their project. Discovery goals follow the project
card order. Hidden items keep their saved position; new items appear at the end.
Ordering does not change pricing or existing quote records.

## Verification

```sh
php artisan test --filter='QuoteBuilderTest|PricingCheckoutTest'
cd frontend
node --test tests/quote-builder-state.test.mjs tests/pricing-response.test.mjs
npx eslint src/pages/QuoteBuilder.tsx src/pages/admin/QuoteBuilderAdmin.tsx src/lib/quote-builder.ts src/lib/quote-builder-state.ts
npm run build
```

Manual browser acceptance: exercise the four steps on desktop, tablet, and
mobile; go back and check retained choices; try discovery and custom quotes;
submit a test lead and inspect its breakdown in admin. Confirm a price edit is
reflected in a fresh estimate. Browser acceptance remains necessary when no
browser connection is available to the development session.
